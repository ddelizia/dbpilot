import dotenv from 'dotenv';
import { parseArgs } from 'node:util';

// Load environment variables from .env if present
dotenv.config();

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface TypesenseConfig {
  host: string;
  port: number;
  protocol: string;
  apiKey: string;
}

export type ConfigSource = 'cli' | 'env' | 'default';

export interface ConfigItem<T> {
  value: T;
  source: ConfigSource;
}

export interface CommandFlags {
  yes: boolean;
  username?: string;
  password?: string;
  collection?: string;
  fields?: string;
  description?: string;
  role?: string;
  id?: string;
  db?: string;
}

export interface AppConfig {
  pg: {
    host: ConfigItem<string>;
    port: ConfigItem<number>;
    user: ConfigItem<string>;
    password: ConfigItem<string>;
    database: ConfigItem<string>;
  };
  ts: {
    host: ConfigItem<string>;
    port: ConfigItem<number>;
    protocol: ConfigItem<string>;
    apiKey: ConfigItem<string>;
  };
  helpRequested: boolean;
  versionRequested: boolean;
  positionals: string[];
  flags: CommandFlags;
}

function resolveItem<T>(
  cliVal: string | undefined,
  envKey: string,
  defaultVal: T,
  transform?: (val: string) => T
): ConfigItem<T> {
  if (cliVal !== undefined && cliVal !== '') {
    return {
      value: transform ? transform(cliVal) : (cliVal as unknown as T),
      source: 'cli',
    };
  }
  const envVal = process.env[envKey];
  if (envVal !== undefined && envVal !== '') {
    return {
      value: transform ? transform(envVal) : (envVal as unknown as T),
      source: 'env',
    };
  }
  return {
    value: defaultVal,
    source: 'default',
  };
}

let cachedConfig: AppConfig | null = null;

export function initConfig(argv: string[] = process.argv.slice(2)): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        'pg-host': { type: 'string', short: 'H' },
        'pg-port': { type: 'string', short: 'p' },
        'pg-user': { type: 'string', short: 'u' },
        'pg-password': { type: 'string' },
        'pg-pass': { type: 'string' },
        'pg-db': { type: 'string', short: 'd' },

        'ts-host': { type: 'string' },
        'ts-port': { type: 'string' },
        'ts-protocol': { type: 'string' },
        'ts-api-key': { type: 'string' },
        'ts-key': { type: 'string' },

        db: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        collection: { type: 'string' },
        fields: { type: 'string' },
        description: { type: 'string' },
        desc: { type: 'string' },
        role: { type: 'string' },
        id: { type: 'string' },
        yes: { type: 'boolean', short: 'y' },

        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
      strict: false,
    });
  } catch (err: any) {
    console.error(`Error parsing arguments: ${err.message}`);
    process.exit(1);
  }

  const values = parsed.values as Record<string, string | boolean | undefined>;

  const pgPass = (values['pg-password'] || values['pg-pass']) as string | undefined;
  const tsKey = (values['ts-api-key'] || values['ts-key']) as string | undefined;

  const toInt = (val: string) => parseInt(val, 10);

  const config: AppConfig = {
    pg: {
      host: resolveItem(values['pg-host'] as string | undefined, 'POSTGRES_HOST', 'localhost'),
      port: resolveItem(values['pg-port'] as string | undefined, 'POSTGRES_PORT', 5432, toInt),
      user: resolveItem(values['pg-user'] as string | undefined, 'POSTGRES_USER', 'postgres'),
      password: resolveItem(pgPass, 'POSTGRES_PASSWORD', 'postgres'),
      database: resolveItem(values['pg-db'] as string | undefined, 'POSTGRES_DB', 'postgres'),
    },
    ts: {
      host: resolveItem(values['ts-host'] as string | undefined, 'TYPESENSE_HOST', 'localhost'),
      port: resolveItem(values['ts-port'] as string | undefined, 'TYPESENSE_PORT', 8108, toInt),
      protocol: resolveItem(values['ts-protocol'] as string | undefined, 'TYPESENSE_PROTOCOL', 'http'),
      apiKey: resolveItem(tsKey, 'TYPESENSE_API_KEY', 'xyz_typesense_admin_key_123'),
    },
    helpRequested: Boolean(values.help),
    versionRequested: Boolean(values.version),
    positionals: parsed.positionals,
    flags: {
      yes: Boolean(values.yes),
      username: values.username as string | undefined,
      password: values.password as string | undefined,
      collection: values.collection as string | undefined,
      fields: values.fields as string | undefined,
      description: (values.description || values.desc) as string | undefined,
      role: values.role as string | undefined,
      id: values.id as string | undefined,
      db: values.db as string | undefined,
    },
  };

  // Sync to process.env so third-party calls or direct references stay in sync
  process.env.POSTGRES_HOST = config.pg.host.value;
  process.env.POSTGRES_PORT = String(config.pg.port.value);
  process.env.POSTGRES_USER = config.pg.user.value;
  process.env.POSTGRES_PASSWORD = config.pg.password.value;
  process.env.POSTGRES_DB = config.pg.database.value;

  process.env.TYPESENSE_HOST = config.ts.host.value;
  process.env.TYPESENSE_PORT = String(config.ts.port.value);
  process.env.TYPESENSE_PROTOCOL = config.ts.protocol.value;
  process.env.TYPESENSE_API_KEY = config.ts.apiKey.value;

  cachedConfig = config;
  return config;
}

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    return initConfig();
  }
  return cachedConfig;
}

export function getPgConfig(customDb?: string): PgConfig {
  const cfg = getAppConfig();
  return {
    host: cfg.pg.host.value,
    port: cfg.pg.port.value,
    user: cfg.pg.user.value,
    password: cfg.pg.password.value,
    database: customDb || cfg.pg.database.value,
  };
}

export function getTypesenseConfig(): TypesenseConfig {
  const cfg = getAppConfig();
  return {
    host: cfg.ts.host.value,
    port: cfg.ts.port.value,
    protocol: cfg.ts.protocol.value,
    apiKey: cfg.ts.apiKey.value,
  };
}

export function printHelp(positionals: string[] = []): void {
  const group = (positionals[0] || '').toLowerCase();
  if (group === 'pg' || group === 'postgres') {
    printPgHelp();
    return;
  }
  if (group === 'ts' || group === 'typesense') {
    printTsHelp();
    return;
  }

  console.log(`
⚡ dbpilot v1.0.0
TUI + CLI for PostgreSQL and Typesense administration

Usage:
  dbpilot [options]                          Launch interactive TUI
  dbpilot <command> [args] [options]         Run a non-interactive command

Commands:
  status                                     Connection health (TUI Overview)
  pg, postgres <action>                      PostgreSQL commands
  ts, typesense <action>                     Typesense commands
  tui                                        Launch interactive TUI (default)

PostgreSQL actions:  list, list-users, create-db, add-user, delete-db, delete-user
Typesense actions:   list, list-keys, create-collection, add-key, delete-collection, delete-key

Run \`dbpilot pg --help\` or \`dbpilot ts --help\` for action-specific usage.

Connection Options:
  -H, --pg-host <host>        PostgreSQL host (default: localhost, env: POSTGRES_HOST)
  -p, --pg-port <port>        PostgreSQL port (default: 5432, env: POSTGRES_PORT)
  -u, --pg-user <user>        PostgreSQL admin username (default: postgres, env: POSTGRES_USER)
      --pg-password <pass>    PostgreSQL admin password (default: postgres, env: POSTGRES_PASSWORD)
      --pg-pass <pass>        Alias for --pg-password
  -d, --pg-db <database>      PostgreSQL maintenance database (default: postgres, env: POSTGRES_DB)
      --ts-host <host>        Typesense host (default: localhost, env: TYPESENSE_HOST)
      --ts-port <port>        Typesense port (default: 8108, env: TYPESENSE_PORT)
      --ts-protocol <proto>   Typesense protocol: http or https (default: http)
      --ts-api-key <key>      Typesense admin API key (env: TYPESENSE_API_KEY)
      --ts-key <key>          Alias for --ts-api-key

General Options:
  -y, --yes                   Skip confirmation on destructive commands
  -h, --help                  Show this help message and exit
  -v, --version               Show version number and exit

Configuration Precedence:
  1. CLI Arguments (highest)
  2. Environment Variables (.env / process.env)
  3. Built-in Defaults (lowest)

Examples:
  $ dbpilot
  $ dbpilot status
  $ dbpilot pg list
  $ dbpilot pg create-db shop --username shop_admin --password secret
  $ dbpilot pg delete-db shop --yes
  $ dbpilot ts list
  $ dbpilot ts delete-collection products --yes
`);
}

function printPgHelp(): void {
  console.log(`
⚡ dbpilot pg — PostgreSQL commands

Usage:
  dbpilot pg <action> [target] [options]

Actions:
  list
      List databases and non-system schemas

  list-users
      List login roles

  create-db <name> --username <user> --password <pass>
      Create a database and dedicated admin user
      Alias flags: --db <name>

  add-user <db> --username <user> --password <pass>
      Grant a user admin privileges on one database
      Alias flags: --db <db>

  delete-db <name> --yes
      Drop a database (terminates open connections)
      Alias flags: --db <name>
      Protected: template0, template1, currently connected database

  delete-user <username> --yes
      Drop a login role (must not own databases)
      Alias flags: --username <username>
      Protected: currently connected admin user

Examples:
  $ dbpilot pg list
  $ dbpilot pg list-users
  $ dbpilot pg create-db shop --username shop_admin --password s3cret
  $ dbpilot pg add-user shop --username reporter --password s3cret
  $ dbpilot pg delete-db shop --yes
  $ dbpilot pg delete-user reporter --yes
`);
}

function printTsHelp(): void {
  console.log(`
⚡ dbpilot ts — Typesense commands

Usage:
  dbpilot ts <action> [target] [options]

Actions:
  list
      List collections, document counts, and schema fields

  list-keys
      List API keys (id, description, collections, actions)

  create-collection <name> [--fields <spec>] [--description <text>]
      Create a collection and a collection-scoped admin API key
      Fields format: title:string, price:int32
      Empty --fields uses auto schema (.*: auto)
      Alias flags: --collection <name>

  add-key <collection> [--description <text>] [--role admin|read-only]
      Create a scoped API key (default role: read-only)
      Alias flags: --collection <collection>

  delete-collection <name> --yes
      Drop a collection and all of its documents
      Alias flags: --collection <name>

  delete-key <id> --yes
      Revoke an API key by numeric id
      Alias flags: --id <id>

Examples:
  $ dbpilot ts list
  $ dbpilot ts list-keys
  $ dbpilot ts create-collection products --fields "title:string, price:int32"
  $ dbpilot ts add-key products --description "search" --role read-only
  $ dbpilot ts delete-collection products --yes
  $ dbpilot ts delete-key 12 --yes
`);
}

export function printVersion(): void {
  console.log('dbpilot v1.0.0');
}
