import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface PgConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface DbSchemaInfo {
  database: string;
  schemas: string[];
}

export function getPgConfig(customDb?: string): PgConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: customDb || process.env.POSTGRES_DB || 'postgres',
  };
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
    const escapedDbName = pg.Client.prototype.escapeIdentifier(dbName);
    const escapedUser = pg.Client.prototype.escapeIdentifier(adminUser);
    const escapedLiteralPass = pg.Client.prototype.escapeLiteral(adminPass);

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
    const escapedDbName = pg.Client.prototype.escapeIdentifier(dbName);
    const escapedUser = pg.Client.prototype.escapeIdentifier(username);
    const escapedLiteralPass = pg.Client.prototype.escapeLiteral(password);

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
