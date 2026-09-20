import chalk from 'chalk';
import { AppConfig, printHelp } from './config.js';
import {
  addUserToDatabase,
  createDatabaseWithAdmin,
  deleteDatabase,
  deleteUser,
  getDatabaseSchemas,
  listPostgresUsers,
  testPgConnection,
} from './services/postgres.js';
import {
  addUserKeyToCollection,
  createCollectionAndAdmin,
  deleteCollection,
  deleteKey,
  getTypesenseCollections,
  getTypesenseKeys,
  parseSchemaFields,
  testTypesenseConnection,
} from './services/typesense.js';

type OpResult = { success: boolean; message: string; apiKey?: { value: string; actions: string[]; collections: string[] } };

function fail(message: string): boolean {
  console.error(chalk.red(`❌ ${message}`));
  process.exitCode = 1;
  return true;
}

function ok(message: string): boolean {
  console.log(chalk.green(`✅ ${message}`));
  return true;
}

function requireValue(value: string | undefined, label: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    fail(`Missing required ${label}.`);
    return null;
  }
  return trimmed;
}

function requireYes(yes: boolean, action: string): boolean {
  if (yes) return true;
  fail(`${action} is destructive. Re-run with --yes to confirm.`);
  return false;
}

async function printStatus(): Promise<boolean> {
  const [pg, ts] = await Promise.all([
    testPgConnection().catch((err) => ({ success: false, message: err.message })),
    testTypesenseConnection().catch((err) => ({ success: false, message: err.message })),
  ]);

  console.log(chalk.bold('Overview & System Health'));
  console.log(
    `🐘 PostgreSQL: ${pg.success ? chalk.green('● Connected') : chalk.red('● Disconnected')}  ${pg.success ? '' : pg.message}`
  );
  console.log(
    `⚡ Typesense:  ${ts.success ? chalk.green('● Connected') : chalk.red('● Disconnected')}  ${ts.success ? '' : ts.message}`
  );

  if (!pg.success || !ts.success) {
    process.exitCode = 1;
  }
  return true;
}

async function pgList(): Promise<boolean> {
  const data = await getDatabaseSchemas();
  if (data.length === 0) {
    console.log(chalk.yellow('No databases found.'));
    return true;
  }
  for (const db of data) {
    console.log(`${chalk.cyan.bold('📁')} ${chalk.white.bold(db.database)}`);
    console.log(`   schemas (${db.schemas.length}): ${db.schemas.join(', ') || '(none)'}`);
  }
  return true;
}

async function pgListUsers(): Promise<boolean> {
  const users = await listPostgresUsers();
  if (users.length === 0) {
    console.log(chalk.yellow('No login roles found.'));
    return true;
  }
  for (const user of users) {
    const badge = user.superuser ? chalk.magenta(' superuser') : '';
    console.log(`👤 ${chalk.white.bold(user.username)}${badge}`);
  }
  return true;
}

async function handleResult(res: OpResult): Promise<boolean> {
  if (!res.success) {
    return fail(res.message);
  }
  ok(res.message);
  if (res.apiKey?.value) {
    console.log(chalk.cyan('🔑 API Key (shown only once):'));
    console.log(chalk.white.bold(`   ${res.apiKey.value}`));
    console.log(
      chalk.gray(
        `   actions: ${res.apiKey.actions.join(', ') || '*'}  collections: ${res.apiKey.collections.join(', ') || '*'}`
      )
    );
  }
  return true;
}

async function runPg(action: string | undefined, target: string | undefined, config: AppConfig): Promise<boolean> {
  const flags = config.flags;
  const dbName = flags.db || target;
  const username = flags.username || (action === 'delete-user' ? target : undefined);

  switch (action) {
    case undefined:
    case 'help':
      printHelp(['pg']);
      return true;
    case 'list':
    case 'ls':
      return pgList();
    case 'list-users':
    case 'users':
      return pgListUsers();
    case 'create-db': {
      const name = requireValue(dbName, 'database name (`pg create-db <name>`)');
      const user = requireValue(flags.username, '--username');
      const password = requireValue(flags.password, '--password');
      if (!name || !user || !password) return true;
      return handleResult(await createDatabaseWithAdmin(name, user, password));
    }
    case 'add-user': {
      const name = requireValue(dbName, 'database name (`pg add-user <db>`)');
      const user = requireValue(flags.username, '--username');
      const password = requireValue(flags.password, '--password');
      if (!name || !user || !password) return true;
      return handleResult(await addUserToDatabase(name, user, password));
    }
    case 'delete-db': {
      const name = requireValue(dbName, 'database name (`pg delete-db <name>`)');
      if (!name) return true;
      if (!requireYes(flags.yes, `Deleting database "${name}"`)) return true;
      return handleResult(await deleteDatabase(name));
    }
    case 'delete-user': {
      const user = requireValue(username, 'username (`pg delete-user <username>`)');
      if (!user) return true;
      if (!requireYes(flags.yes, `Deleting user "${user}"`)) return true;
      return handleResult(await deleteUser(user));
    }
    default:
      return fail(`Unknown PostgreSQL action "${action}". Run \`db-setup pg --help\`.`);
  }
}

async function tsList(): Promise<boolean> {
  const collections = await getTypesenseCollections();
  if (collections.length === 0) {
    console.log(chalk.yellow('No collections found.'));
    return true;
  }
  for (const col of collections) {
    console.log(
      `${chalk.yellow.bold('📦')} ${chalk.white.bold(col.name)}  ${chalk.cyan(`${col.num_documents} docs`)}`
    );
    for (const field of col.fields) {
      const optional = field.optional ? ' (optional)' : '';
      console.log(`   • ${chalk.green(field.name)}: ${chalk.magenta(field.type)}${optional}`);
    }
  }
  return true;
}

async function tsListKeys(): Promise<boolean> {
  const keys = await getTypesenseKeys();
  if (keys.length === 0) {
    console.log(chalk.yellow('No API keys found.'));
    return true;
  }
  for (const key of keys) {
    console.log(
      `${chalk.cyan.bold('🔑')} #${key.id}  ${key.description || '(no description)'}`
    );
    console.log(
      `   collections: ${key.collections.join(', ') || '*'}  actions: ${key.actions.join(', ') || '*'}`
    );
  }
  return true;
}

function parseRole(raw: string | undefined): 'admin' | 'read-only' | null {
  const role = (raw || 'read-only').trim().toLowerCase();
  if (role === 'admin' || role === 'read-only' || role === 'readonly' || role === 'read') {
    return role === 'admin' ? 'admin' : 'read-only';
  }
  fail(`Invalid --role "${raw}". Use admin or read-only.`);
  return null;
}

async function runTs(action: string | undefined, target: string | undefined, config: AppConfig): Promise<boolean> {
  const flags = config.flags;
  const collection = flags.collection || target;
  const keyIdRaw = flags.id || (action === 'delete-key' ? target : undefined);

  switch (action) {
    case undefined:
    case 'help':
      printHelp(['ts']);
      return true;
    case 'list':
    case 'ls':
      return tsList();
    case 'list-keys':
    case 'keys':
      return tsListKeys();
    case 'create-collection': {
      const name = requireValue(collection, 'collection name (`ts create-collection <name>`)');
      if (!name) return true;
      const fields = parseSchemaFields(flags.fields || '');
      return handleResult(
        await createCollectionAndAdmin(name, fields, flags.description)
      );
    }
    case 'add-key': {
      const name = requireValue(collection, 'collection name (`ts add-key <collection>`)');
      const role = parseRole(flags.role);
      if (!name || !role) return true;
      return handleResult(
        await addUserKeyToCollection(name, flags.description || `${role.toUpperCase()} key for ${name}`, role)
      );
    }
    case 'delete-collection': {
      const name = requireValue(collection, 'collection name (`ts delete-collection <name>`)');
      if (!name) return true;
      if (!requireYes(flags.yes, `Deleting collection "${name}"`)) return true;
      return handleResult(await deleteCollection(name));
    }
    case 'delete-key': {
      const raw = requireValue(keyIdRaw, 'key id (`ts delete-key <id>`)');
      if (!raw) return true;
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        return fail(`Invalid key id "${raw}". Expected a positive integer.`);
      }
      if (!requireYes(flags.yes, `Deleting API key #${id}`)) return true;
      return handleResult(await deleteKey(id));
    }
    default:
      return fail(`Unknown Typesense action "${action}". Run \`db-setup ts --help\`.`);
  }
}

/**
 * Run a non-interactive CLI command.
 * @returns true if a command was handled (caller should exit), false to launch the TUI.
 */
export async function runCliCommand(config: AppConfig): Promise<boolean> {
  const [groupRaw, action, target] = config.positionals;
  if (!groupRaw) {
    return false;
  }

  const group = groupRaw.toLowerCase();

  if (group === 'tui') {
    return false;
  }

  try {
    if (group === 'status' || group === 'overview') {
      return await printStatus();
    }
    if (group === 'help') {
      printHelp(config.positionals.slice(1));
      return true;
    }
    if (group === 'pg' || group === 'postgres') {
      return await runPg(action?.toLowerCase(), target, config);
    }
    if (group === 'ts' || group === 'typesense') {
      return await runTs(action?.toLowerCase(), target, config);
    }
    return fail(`Unknown command "${groupRaw}". Run \`db-setup --help\`.`);
  } catch (err: any) {
    return fail(err.message || String(err));
  }
}
