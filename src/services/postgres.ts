import pg from 'pg';
import { getPgConfig, PgConfig } from '../config.js';

export { getPgConfig, type PgConfig };

export interface DbSchemaInfo {
  database: string;
  schemas: string[];
}

export interface PgUserInfo {
  username: string;
  superuser: boolean;
}

const RESERVED_DATABASES = new Set(['template0', 'template1']);

function escapeIdent(value: string): string {
  return pg.Client.prototype.escapeIdentifier(value);
}

function escapeLit(value: string): string {
  return pg.Client.prototype.escapeLiteral(value);
}


export function createPgClient(config?: PgConfig): pg.Client {
  return new pg.Client(config || getPgConfig());
}

export async function testPgConnection(): Promise<{ success: boolean; message: string }> {
  const client = createPgClient();
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { success: true, message: 'Connected' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Connection failed' };
  }
}

/**
 * Fetch all databases and their associated schemas
 */
export async function getDatabaseSchemas(): Promise<DbSchemaInfo[]> {
  const client = createPgClient();
  await client.connect();
  
  try {
    const dbRes = await client.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname ASC;`
    );
    const dbNames = dbRes.rows.map(r => r.datname);

    const result: DbSchemaInfo[] = [];

    for (const dbName of dbNames) {
      const dbClient = createPgClient(getPgConfig(dbName));
      try {
        await dbClient.connect();
        const schemaRes = await dbClient.query<{ schema_name: string }>(
          `SELECT schema_name FROM information_schema.schemata 
           WHERE schema_name NOT IN ('pg_catalog', 'information_schema') 
             AND schema_name NOT LIKE 'pg_temp_%' 
             AND schema_name NOT LIKE 'pg_toast_%'
           ORDER BY schema_name ASC;`
        );
        result.push({
          database: dbName,
          schemas: schemaRes.rows.map(s => s.schema_name),
        });
      } catch (err: any) {
        result.push({
          database: dbName,
          schemas: [`[Error connecting: ${err.message}]`],
        });
      } finally {
        await dbClient.end();
      }
    }

    return result;
  } finally {
    await client.end();
  }
}

/**
 * Create a new database and a dedicated admin user/pass for it
 */
export async function createDatabaseWithAdmin(
  dbName: string,
  adminUser: string,
  adminPass: string
): Promise<{ success: boolean; message: string }> {
  const client = createPgClient();
  await client.connect();

  try {
    // Escape identifiers safely
    const escapedDbName = escapeIdent(dbName);
    const escapedUser = escapeIdent(adminUser);
    const escapedLiteralPass = escapeLit(adminPass);

    // 1. Create user if not exists or set password
    const userCheck = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [adminUser]);
    if (userCheck.rows.length === 0) {
      await client.query(`CREATE USER ${escapedUser} WITH PASSWORD ${escapedLiteralPass};`);
    } else {
      await client.query(`ALTER USER ${escapedUser} WITH PASSWORD ${escapedLiteralPass};`);
    }

    // 2. Create database with owner
    await client.query(`CREATE DATABASE ${escapedDbName} OWNER ${escapedUser};`);

    // 3. Grant privileges on database
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${escapedDbName} TO ${escapedUser};`);

    // 4. Connect to new database and grant schema privileges
    const targetDbClient = createPgClient(getPgConfig(dbName));
    try {
      await targetDbClient.connect();
      await targetDbClient.query(`GRANT ALL ON SCHEMA public TO ${escapedUser};`);
      await targetDbClient.query(`ALTER SCHEMA public OWNER TO ${escapedUser};`);
    } finally {
      await targetDbClient.end();
    }

    return {
      success: true,
      message: `Database "${dbName}" created successfully with admin user "${adminUser}".`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create database' };
  } finally {
    await client.end();
  }
}

/**
 * Add a new user as admin of a specific database only
 */
export async function addUserToDatabase(
  dbName: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const rootClient = createPgClient();
  await rootClient.connect();

  try {
    const escapedDbName = escapeIdent(dbName);
    const escapedUser = escapeIdent(username);
    const escapedLiteralPass = escapeLit(password);

    // 1. Check/create role
    const userCheck = await rootClient.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [username]);
    if (userCheck.rows.length === 0) {
      await rootClient.query(`CREATE USER ${escapedUser} WITH PASSWORD ${escapedLiteralPass};`);
    } else {
      await rootClient.query(`ALTER USER ${escapedUser} WITH PASSWORD ${escapedLiteralPass};`);
    }

    // 2. Grant CONNECT on database
    await rootClient.query(`GRANT CONNECT ON DATABASE ${escapedDbName} TO ${escapedUser};`);
    await rootClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${escapedDbName} TO ${escapedUser};`);

    // 3. Connect to specific target DB to grant schema & table privileges
    const targetDbClient = createPgClient(getPgConfig(dbName));
    await targetDbClient.connect();
    try {
      await targetDbClient.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${escapedUser};`);
      await targetDbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${escapedUser};`);
      await targetDbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${escapedUser};`);
      await targetDbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${escapedUser};`);
      await targetDbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${escapedUser};`);
    } finally {
      await targetDbClient.end();
    }

    return {
      success: true,
      message: `User "${username}" created and granted admin privileges on database "${dbName}".`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to add user to database' };
  } finally {
    await rootClient.end();
  }
}

/**
 * List login roles (excluding reserved pg_* roles)
 */
export async function listPostgresUsers(): Promise<PgUserInfo[]> {
  const client = createPgClient();
  await client.connect();

  try {
    const res = await client.query<{ rolname: string; rolsuper: boolean }>(
      `SELECT rolname, rolsuper
       FROM pg_roles
       WHERE rolcanlogin = true
         AND rolname NOT LIKE 'pg_%'
       ORDER BY rolname ASC;`
    );
    return res.rows.map((row) => ({
      username: row.rolname,
      superuser: row.rolsuper,
    }));
  } finally {
    await client.end();
  }
}

/**
 * Drop a database after terminating open connections.
 * Refuses reserved templates and the currently connected database.
 */
export async function deleteDatabase(
  dbName: string
): Promise<{ success: boolean; message: string }> {
  const trimmed = dbName.trim();
  if (!trimmed) {
    return { success: false, message: 'Database name is required.' };
  }
  if (RESERVED_DATABASES.has(trimmed)) {
    return { success: false, message: `Cannot delete reserved database "${trimmed}".` };
  }

  const cfg = getPgConfig();
  if (trimmed === cfg.database) {
    return {
      success: false,
      message: `Cannot delete the currently connected database "${trimmed}". Re-run with --pg-db pointing at a different database.`,
    };
  }

  const client = createPgClient();
  await client.connect();

  try {
    const exists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [trimmed]);
    if (exists.rows.length === 0) {
      return { success: false, message: `Database "${trimmed}" does not exist.` };
    }

    await client.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [trimmed]
    );

    await client.query(`DROP DATABASE ${escapeIdent(trimmed)}`);
    return { success: true, message: `Database "${trimmed}" deleted.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete database' };
  } finally {
    await client.end();
  }
}

/**
 * Drop a login role after reassigning/dropping owned objects in every database.
 * Refuses the currently connected admin user and roles that own databases.
 */
export async function deleteUser(
  username: string
): Promise<{ success: boolean; message: string }> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { success: false, message: 'Username is required.' };
  }

  const cfg = getPgConfig();
  if (trimmed === cfg.user) {
    return {
      success: false,
      message: `Cannot delete the currently connected user "${trimmed}".`,
    };
  }
  if (trimmed.startsWith('pg_')) {
    return { success: false, message: `Cannot delete reserved role "${trimmed}".` };
  }

  const client = createPgClient();
  await client.connect();

  try {
    const exists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [trimmed]);
    if (exists.rows.length === 0) {
      return { success: false, message: `User "${trimmed}" does not exist.` };
    }

    const ownedDbs = await client.query<{ datname: string }>(
      `SELECT d.datname
       FROM pg_database d
       JOIN pg_roles r ON d.datdba = r.oid
       WHERE r.rolname = $1
       ORDER BY d.datname`,
      [trimmed]
    );
    if (ownedDbs.rows.length > 0) {
      const names = ownedDbs.rows.map((row) => row.datname).join(', ');
      return {
        success: false,
        message: `User "${trimmed}" owns database(s): ${names}. Delete or reassign those databases first.`,
      };
    }

    const escapedUser = escapeIdent(trimmed);
    const escapedCurrent = escapeIdent(cfg.user);
    const dbs = await client.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    );

    const revokeErrors: string[] = [];
    for (const row of dbs.rows) {
      const dbClient = createPgClient(getPgConfig(row.datname));
      try {
        await dbClient.connect();
        await dbClient.query(`REASSIGN OWNED BY ${escapedUser} TO ${escapedCurrent}`);
        await dbClient.query(`DROP OWNED BY ${escapedUser}`);
      } catch (err: any) {
        revokeErrors.push(`${row.datname}: ${err.message || 'failed to drop owned objects'}`);
      } finally {
        await dbClient.end();
      }
    }

    await client.query(`DROP ROLE ${escapedUser}`);
    const suffix =
      revokeErrors.length > 0
        ? ` Some databases could not be fully cleaned: ${revokeErrors.join('; ')}`
        : '';
    return { success: true, message: `User "${trimmed}" deleted.${suffix}` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete user' };
  } finally {
    await client.end();
  }
}
