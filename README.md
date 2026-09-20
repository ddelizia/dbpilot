# ⚡ dbpilot

An interactive Terminal User Interface (TUI) and scriptable CLI built with
**TypeScript**, **React**, and [**Ink**](https://github.com/vadimdemedes/ink)
for administering **PostgreSQL** databases/users and **Typesense** search
collections/API keys.

`dbpilot` provides a persistent split-pane sidebar cockpit for day-to-day
database administration, user provisioning, permission management, and search
index curation. It also features a headless, non-interactive CLI mode for
automated scripts and CI/CD pipelines, dynamic configuration with automatic
precedence resolution, and zero-dependency standalone native binaries for macOS,
Linux, and Windows.

---

## 📋 Table of Contents

- [⚡ Quick Install (via curl)](#-quick-install-via-curl)
  - [One-Line Install](#one-line-install)
  - [Installation Options](#installation-options)
  - [Verifying Installation](#verifying-installation)
- [🚀 How to Use It](#-how-to-use-it)
  - [1. Interactive TUI Mode (Default)](#1-interactive-tui-mode-default)
  - [2. Non-Interactive CLI Mode (Scripting & Automation)](#2-non-interactive-cli-mode-scripting--automation)
  - [3. Connection & Configuration Overrides](#3-connection--configuration-overrides)
  - [4. Local Stack with Docker Compose](#4-local-stack-with-docker-compose)
- [✨ Key Features](#-key-features)
- [🛠 Architecture & Tech Stack](#-architecture--tech-stack)
- [📂 Project Structure](#-project-structure)
- [📦 Developer Setup & Building from Source](#-developer-setup--building-from-source)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Production Node Build](#production-node-build)
  - [Standalone Binary Compilation](#standalone-binary-compilation)
  - [Docker Service Management](#docker-service-management)
- [🧭 TUI Layout & Navigation Reference](#-tui-layout--navigation-reference)
- [🎮 Detailed TUI Feature Walkthrough](#-detailed-tui-feature-walkthrough)
- [⚙️ Configuration Reference (.env)](#️-configuration-reference-env)
- [🚀 Automated Release Pipeline](#-automated-release-pipeline)
- [❓ Troubleshooting](#-troubleshooting)

---

## ⚡ Quick Install (via curl)

### One-Line Install

Install the standalone pre-compiled `dbpilot` binary for macOS or Linux directly
from the latest GitHub Release:

```bash
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash
```

Or using the root repository shortcut:

```bash
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/install.sh | bash
```

#### What the installer does automatically:

1. **Detects Platform**: Identifies your operating system (macOS, Linux) and CPU
   architecture (Apple Silicon `arm64`, Intel `x64`, Linux `arm64`/`x86_64`).
2. **Zero Dependencies**: Downloads a pre-compiled, self-contained native
   executable—no Node.js, pnpm, or Bun runtime required.
3. **Checksum Verification**: Verifies the binary's SHA-256 hash against
   `SHA256SUMS.txt`.
4. **Installs & Links**: Places `dbpilot` into `/usr/local/bin` (or
   `~/.local/bin`) and creates backward-compatible alias symlinks (`db-setup`,
   `db-manager`).

---

### Installation Options

You can customize the target version, installation directory, or repository:

```bash
# Install a specific release version (e.g. v1.0.0)
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --version v1.0.0
# Or using an environment variable
VERSION=v1.0.0 curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash

# Install to a custom directory (e.g. ~/.local/bin or ~/bin)
INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash

# View all installer options
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --help

# Uninstall dbpilot and its aliases
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --uninstall

# Uninstall from a custom directory
curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --uninstall --dir ~/.local/bin
```

---

### Verifying Installation

Verify that `dbpilot` is installed and reachable in your `$PATH`:

```bash
dbpilot --version
dbpilot --help
```

> [!TIP]
> If `dbpilot` is not recognized after installation, make sure your installation
> directory (`/usr/local/bin` or `~/.local/bin`) is included in your shell
> profile (`~/.zshrc`, `~/.bashrc`, or `~/.config/fish/config.fish`).

---

## 🚀 How to Use It

`dbpilot` supports two distinct operating modes: an **interactive split-pane TUI
cockpit** for manual administrative workflows, and a **non-interactive CLI** for
scripts, cron jobs, and CI/CD pipelines.

```
               ┌───────────────────────────────┐
               │            dbpilot            │
               └───────────────┬───────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
Interactive TUI Mode              Non-Interactive CLI Mode
- Split-pane navigation           - Single command execution
- Forms, spinners, passwords      - Scriptable & CI/CD friendly
- Real-time connection health     - JSON / plain-text friendly
```

---

### 1. Interactive TUI Mode (Default)

Running `dbpilot` with no subcommands opens the full interactive terminal user
interface:

```bash
dbpilot
# Or explicitly:
dbpilot tui
```

#### Keyboard Controls & Shortcuts

| Key                    | Action              | Description                                                          |
| ---------------------- | ------------------- | -------------------------------------------------------------------- |
| `↑` / `↓` or `k` / `j` | **Navigate**        | Move selection up and down in the sidebar                            |
| `Enter` or `→`         | **Select / Focus**  | Choose active menu item and transfer focus into the form view        |
| `Tab`                  | **Switch Pane**     | Toggle keyboard focus between Sidebar and the Active View            |
| `Esc`                  | **Back to Sidebar** | Unfocus the current form/wizard and return focus to the sidebar      |
| `0` - `9`, `x`         | **Direct Jump**     | Jump immediately to any numbered view from anywhere in the TUI       |
| `r`                    | **Refresh**         | Trigger an instant live connection health check for PG and Typesense |
| `q` or `Ctrl+C`        | **Quit**            | Exit `dbpilot` safely                                                |

#### Available TUI Views & Operations:

- **🏠 [0] Overview & Status**: Displays live connection status badges
  (`● Connected` / `● Disconnected`), latency, active host:port endpoints, and
  where each configuration setting was resolved from (`[CLI Flag]`, `[.env]`, or
  `[default]`).
- **🐘 [1] View Schemas**: Queries the PostgreSQL instance to list all
  non-system databases and their user-defined schemas.
- **🐘 [2] Create DB & Admin**: Interactive wizard to provision a new PostgreSQL
  database and a dedicated owner user with full permissions in one step.
- **🐘 [3] Add DB User**: Wizard to create a database-scoped login user and
  grant permissions on schemas, tables, and sequences within that specific
  database.
- **🐘 [4] Delete DB**: Select and safely drop a database. Open client
  connections are terminated first; system databases (`template0`, `template1`,
  maintenance DB) are protected.
- **🐘 [5] Delete User**: Safely drop a PostgreSQL role (verifies first that the
  user does not own existing databases).
- **⚡ [6] View Collections**: Connects to Typesense to list all search
  collections, document counts, and schema field types.
- **⚡ [7] Create Col & Key**: Interactive wizard to define a search collection
  schema and generate a scoped admin API key.
- **⚡ [8] Add Col Key**: Provision a scoped API key for a collection with
  either `admin` (`*`) or `read-only` (`documents:search`) permissions.
- **⚡ [9] Delete Collection**: Drop a Typesense collection and delete its
  indexed documents.
- **⚡ [x] Delete Key**: Revoke Typesense API keys by numeric ID.

---

### 2. Non-Interactive CLI Mode (Scripting & Automation)

Every administrative action available in the TUI can also be executed as a
direct command.

#### Quick Health Check

Check cluster connectivity and exit with code `0` (success) or `1` (failure):

```bash
dbpilot status
```

#### PostgreSQL Administration

```bash
# List all non-template databases and schemas
dbpilot pg list

# List all PostgreSQL login roles
dbpilot pg list-users

# Create a new database with a dedicated owner admin
dbpilot pg create-db ecommerce --username ecommerce_admin --password "s3cur3Pass!"

# Add a database-scoped user with permissions on schemas/tables/sequences
dbpilot pg add-user ecommerce --username analytics_worker --password "WorkerPass123"

# Drop a database (requires --yes confirmation)
dbpilot pg delete-db ecommerce --yes

# Drop a user role (requires --yes confirmation)
dbpilot pg delete-user analytics_worker --yes

# View PostgreSQL command help
dbpilot pg --help
```

#### Typesense Search Administration

```bash
# List collections, document counts, and schema fields
dbpilot ts list

# List all issued API keys (id, description, actions, collections)
dbpilot ts list-keys

# Create a collection with schema fields
dbpilot ts create-collection products --fields "title:string, price:int32, in_stock:bool"

# Create a collection with auto-inferred schema fields
dbpilot ts create-collection logs

# Generate a Read-Only search key for frontend clients
dbpilot ts add-key products --description "Web frontend search key" --role read-only

# Generate a Full Admin key scoped strictly to one collection
dbpilot ts add-key products --description "Catalog ingestion key" --role admin

# Drop a search collection (requires --yes confirmation)
dbpilot ts delete-collection products --yes

# Revoke an API key by ID (requires --yes confirmation)
dbpilot ts delete-key 42 --yes

# View Typesense command help
dbpilot ts --help
```

> [!IMPORTANT]
> All destructive operations (`delete-db`, `delete-user`, `delete-collection`,
> `delete-key`) require the `-y` or `--yes` flag in non-interactive mode.

---

### 3. Connection & Configuration Overrides

You can point `dbpilot` to any local, staging, or production cluster without
modifying config files by using CLI flags:

```bash
# Connect to a remote PostgreSQL instance
dbpilot --pg-host postgres.prod.internal --pg-port 5432 --pg-user dba --pg-pass "prod_secret"

# Connect to a remote Typesense cluster
dbpilot --ts-host search.company.com --ts-port 443 --ts-protocol https --ts-api-key "xyz_master_key"

# Combine flags with non-interactive commands
dbpilot pg list --pg-host 10.0.0.5 -u postgres --pg-pass secret
```

#### Configuration Precedence Order

When resolving connection settings, `dbpilot` applies the following priority:

```
┌────────────────────────────────────────────────────────┐
│ 1. CLI Arguments & Flags (Highest Priority)            │
├────────────────────────────────────────────────────────┤
│ 2. Environment Variables (.env / shell environment)    │
├────────────────────────────────────────────────────────┤
│ 3. Built-in Defaults (Lowest Priority)                 │
└────────────────────────────────────────────────────────┘
```

#### CLI Flags Reference

| Flag                    | Short | Default     | Description                                      |
| ----------------------- | ----- | ----------- | ------------------------------------------------ |
| `--pg-host <host>`      | `-H`  | `localhost` | PostgreSQL host address                          |
| `--pg-port <port>`      | `-p`  | `5432`      | PostgreSQL port                                  |
| `--pg-user <user>`      | `-u`  | `postgres`  | PostgreSQL administrative username               |
| `--pg-password <pass>`  |       | `postgres`  | PostgreSQL administrative password               |
| `--pg-pass <pass>`      |       | `postgres`  | Alias for `--pg-password`                        |
| `--pg-db <database>`    | `-d`  | `postgres`  | Maintenance database to connect to               |
| `--ts-host <host>`      |       | `localhost` | Typesense host address                           |
| `--ts-port <port>`      |       | `8108`      | Typesense port                                   |
| `--ts-protocol <proto>` |       | `http`      | Typesense protocol (`http` or `https`)           |
| `--ts-api-key <key>`    |       | `xyz_...`   | Typesense admin API key                          |
| `--ts-key <key>`        |       | `xyz_...`   | Alias for `--ts-api-key`                         |
| `--db <name>`           |       |             | Target database name for `pg` commands           |
| `--username <user>`     |       |             | Target username for `pg` commands                |
| `--password <pass>`     |       |             | Target password for user provisioning            |
| `--collection <name>`   |       |             | Target collection name for `ts` commands         |
| `--fields <spec>`       |       |             | Schema fields (e.g. `title:string, price:int32`) |
| `--description <text>`  |       |             | API key description                              |
| `--role <role>`         |       | `read-only` | Key access role: `admin` or `read-only`          |
| `--id <id>`             |       |             | Typesense API key ID                             |
| `--yes`                 | `-y`  |             | Skip confirmation on destructive actions         |
| `--help`                | `-h`  |             | Show help information                            |
| `--version`             | `-v`  |             | Show version number                              |

---

### 4. Local Stack with Docker Compose

This repository includes a ready-to-use Docker Compose configuration running
**PostgreSQL 16 (Alpine)** and **Typesense 27.1** with dedicated isolated bridge
networks:

```bash
# 1. Start PostgreSQL and Typesense in the background
docker compose up -d

# 2. Check service health
dbpilot status

# 3. Open the interactive management cockpit
dbpilot
```

---

## ✨ Key Features

- **Split-Pane Sidebar Dashboard**: Persistent navigation sidebar on the left,
  live active views and interactive wizards on the right, with real-time status
  indicators.
- **Dual Operating Modes**: Full interactive TUI or headless scriptable CLI for
  automation and CI/CD pipelines.
- **PostgreSQL Administration**:
  - Browse databases and user-defined schemas.
  - One-step database and dedicated admin role provisioning.
  - Database-scoped user creation with grants on schemas, tables, and sequences.
  - Safe database deletion that automatically terminates open client connections
    first.
  - Safe role deletion guarded against deleting database owners or active admin
    accounts.
- **Typesense Search Administration**:
  - Browse collections, document totals, and schema field types.
  - Create collections with typed fields or schema auto-detection.
  - Generate scoped API keys for applications (Full Admin or Read-Only Search).
  - Drop collections and revoke API keys with confirmation safeguards.
- **Dynamic Configuration**: CLI flags, `.env` file support, and built-in
  defaults with automatic source attribution.
- **Zero-Dependency Native Binaries**: Pre-compiled single-file standalone
  executables for macOS (Apple Silicon & Intel), Linux (x86_64 & ARM64), and
  Windows.

---

## 🛠 Architecture & Tech Stack

- **Language**: TypeScript (ESM)
- **TUI Framework**: [Ink 5](https://github.com/vadimdemedes/ink) & React 18
- **CLI Argument Parsing**: `node:util` `parseArgs` (zero external dependencies,
  Node 20+ and Bun compatible)
- **Database & Search Clients**:
  - [`pg`](https://node-postgres.com/) for PostgreSQL pool management,
    connection termination, and DDL/DCL execution
  - [`typesense`](https://typesense.org/docs/) client for cluster health checks,
    collection schemas, and key provisioning
- **Bundler & Cross-Compiler**:
  - [`tsx`](https://github.com/privatenumber/tsx) for fast development execution
  - [`esbuild`](https://esbuild.github.io/) for bundling into an optimized ESM
    bundle
  - [`bun build --compile`](https://bun.sh/docs/bundler/executables) for
    compiling standalone cross-platform executables
- **Container Environment**: Docker Compose with PostgreSQL 16 (Alpine) and
  Typesense 27.1

---

## 📂 Project Structure

```text
dbpilot/
├── bin/                              # Standalone compiled binaries
│   ├── dbpilot-darwin-arm64          # macOS Apple Silicon
│   ├── dbpilot-darwin-x64            # macOS Intel
│   ├── dbpilot-linux-arm64           # Linux ARM64
│   ├── dbpilot-linux-x64             # Linux x86_64
│   └── dbpilot-windows-x64.exe       # Windows x64
├── cli/
│   └── install.sh                    # Universal curl installation script
├── dist/                             # Compiled JavaScript output
│   ├── bundle.mjs                    # Bundled ESM application
│   └── cli.js                        # Node executable entrypoint
├── src/
│   ├── cli.tsx                       # Main TUI entrypoint, focus router, and app layout
│   ├── commands.ts                   # Non-interactive CLI command dispatcher
│   ├── config.ts                     # CLI argument parser, .env loader, and config store
│   ├── components/
│   │   ├── Header.tsx                # Banner with active PG/TS endpoints and sources
│   │   ├── Sidebar.tsx               # Split-pane sidebar navigation & live status
│   │   ├── Footer.tsx                # Context-sensitive keyboard shortcut hints
│   │   └── views/
│   │       ├── Overview.tsx                  # Dashboard with connection & source summary
│   │       ├── AddPostgresUser.tsx           # Database-specific user provisioning
│   │       ├── AddTypesenseUser.tsx          # Collection-scoped API key creation
│   │       ├── CreatePostgresDb.tsx          # DB + dedicated admin wizard
│   │       ├── CreateTypesenseCollection.tsx # Collection schema + key wizard
│   │       ├── ViewPostgresSchemas.tsx       # Schema explorer
│   │       ├── ViewTypesenseCollections.tsx  # Collection explorer
│   │       ├── DeletePostgresDb.tsx          # Database drop wizard
│   │       ├── DeletePostgresUser.tsx        # Role drop wizard
│   │       ├── DeleteTypesenseCollection.tsx # Collection drop wizard
│   │       └── DeleteTypesenseKey.tsx        # API key revoke wizard
│   ├── services/
│   │   ├── postgres.ts               # PostgreSQL connection, queries, and role grants
│   │   └── typesense.ts              # Typesense API client and key management
│   └── shims/
│       └── devtools.ts               # React DevTools stub for standalone binary compilation
├── .env.example                      # Template for environment variables
├── docker-compose.yml                # PostgreSQL 16 & Typesense 27.1 services
├── install.sh                        # Root shortcut for curl installation
├── package.json                      # Scripts and dependencies
├── tsconfig.json                     # TypeScript compiler configuration
└── pnpm-lock.yaml                    # Dependency lockfile
```

---

## 📦 Developer Setup & Building from Source

### Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or `v10.x`
- **Docker & Docker Compose**: Docker 24+ with Compose v2
- **Bun** _(Optional)_: `v1.1+` (only needed for `pnpm run build:bin`
  cross-compilation)

### Local Development

1. **Clone the repository**:
   ```bash
   ```

git clone https://github.com/ddelizia/dbpilot.git dbpilot cd dbpilot

````
2. **Install dependencies**:
```bash
pnpm install
````

3. **Start local database services**:
   ```bash
   docker compose up -d
   ```

4. **Run `dbpilot` in development mode** (via `tsx` with hot reload):
   ```bash
   # Launch interactive TUI
   pnpm start

   # Run a CLI command
   pnpm start -- pg list
   pnpm start -- ts list
   ```

5. **Run TypeScript type validation**:
   ```bash
   pnpm run typecheck
   ```

### Production Node Build

To compile TypeScript to ESM in `dist/`:

```bash
pnpm run build
```

Run the built JavaScript output:

```bash
node dist/cli.js
```

Or link globally to run `dbpilot` from your shell:

```bash
pnpm link --global
dbpilot
```

### Standalone Binary Compilation

To bundle and compile zero-dependency native executables for all platforms:

```bash
pnpm run build:bin
```

Binaries will be output to the `bin/` directory:

- `bin/dbpilot-darwin-arm64`
- `bin/dbpilot-darwin-x64`
- `bin/dbpilot-linux-arm64`
- `bin/dbpilot-linux-x64`
- `bin/dbpilot-windows-x64.exe`

### Docker Service Management

| Action                           | Command                            |
| -------------------------------- | ---------------------------------- |
| Start services                   | `docker compose up -d`             |
| View combined logs               | `docker compose logs -f`           |
| View Postgres logs               | `docker compose logs -f postgres`  |
| View Typesense logs              | `docker compose logs -f typesense` |
| Stop services                    | `docker compose stop`              |
| Teardown containers              | `docker compose down`              |
| Clean slate (erase data volumes) | `docker compose down -v`           |

---

## 🧭 TUI Layout & Navigation Reference

The interactive TUI provides a split-pane layout with persistent navigation on
the left and dynamic content on the right:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ DBPILOT — POSTGRES & TYPESENSE TUI MANAGER                                  v1.0.0  │
│ 🐘 PG: localhost:5432 (postgres) | ⚡ TS: http://localhost:8108                        │
├──────────────────────────────────┬─────────────────────────────────────────────────────┤
│ 📋 NAVIGATION                    │ 🖥️  ACTIVE VIEW                                     │
│                                  │                                                     │
│ 🏠 [0] Overview & Status         │ 🏠 Overview & System Health                         │
│                                  │                                                     │
│ 🐘 PostgreSQL                    │ 🐘 PostgreSQL Connection: ● Connected               │
│  ▸ [1] View Schemas              │   Target: localhost:5432 [CLI Flag]                 │
│    [2] Create DB & Admin         │                                                     │
│    [3] Add DB User               │ ⚡ Typesense Cluster: ● Connected                   │
│    [4] Delete DB                 │   Endpoint: http://localhost:8108 [.env]            │
│    [5] Delete User               │                                                     │
│                                  │                                                     │
│ ⚡ Typesense                     │                                                     │
│    [6] View Collections          │                                                     │
│    [7] Create Col & Key          │                                                     │
│    [8] Add Col Key               │                                                     │
│    [9] Delete Collection         │                                                     │
│    [x] Delete Key                │                                                     │
│                                  │                                                     │
│ ── System ────────────────────── │                                                     │
│    [q] Exit Application          │                                                     │
│                                  │                                                     │
│ ── LIVE STATUS ───────────────   │                                                     │
│ 🐘 PG: 5432  ● Online            │                                                     │
│ ⚡ TS: 8108  ● Online            │                                                     │
├──────────────────────────────────┴─────────────────────────────────────────────────────┤
│ [↑/↓] Navigate  [Enter/→] Open  [0-9/x] Jump  [Tab] Switch Pane  [r] Refresh  [q] Quit  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎮 Detailed TUI Feature Walkthrough

### 🏠 0. Overview & Health Dashboard

- Displays active connection targets for PostgreSQL and Typesense.
- Shows real-time connection status badges (`● Connected` / `● Disconnected`).
- Highlights the **configuration source** for each parameter (`[CLI Flag]`,
  `[.env]`, or `[default]`).

### 🐘 1. View PostgreSQL Database Schemas

- Queries the PostgreSQL instance for all non-template databases.
- Lists each database alongside all active schemas (excluding internal catalogs
  like `pg_catalog` and `information_schema`).

### ➕ 2. Create New PostgreSQL Database & Admin User

- **Step 1**: Enter the new database name.
- **Step 2**: Enter the new admin username.
- **Step 3**: Enter the admin password (masked with `*`).
- **What it does**:
  1. Creates the user role in PostgreSQL if not already present.
  2. Creates the database with the user set as `OWNER`.
  3. Grants all privileges on the database and sets the user as owner of the
     `public` schema.

### 👤 3. Add User to PostgreSQL Database

- **Step 1**: Enter target database name.
- **Step 2**: Enter username.
- **Step 3**: Enter password.
- **What it does**:
  1. Creates the role with password.
  2. Grants `CONNECT` and `ALL PRIVILEGES` on the specified database.
  3. Grants full permissions and default privileges on all schemas, tables, and
     sequences within that specific database only.

### 🗑 4. Delete PostgreSQL Database

- Lists non-template databases.
- Prompts for confirmation before dropping. Open connections to the target
  database are terminated first.
- Protects `template0`, `template1`, and the currently connected maintenance
  database.

### 🗑 5. Delete PostgreSQL User

- Lists login roles except the connected admin user.
- Prompts for confirmation before dropping. Roles that still own databases must
  have those databases dropped first.

### ⚡ 6. View Typesense Collections

- Connects to the Typesense cluster and retrieves all collections.
- Displays collection names, total document counts, and schema field definitions
  with types and optionality flags.

### ➕ 7. Create New Typesense Collection & Admin Key

- **Step 1**: Enter the collection name.
- **Step 2**: Enter a key description or owner name.
- **Step 3**: Define schema fields (e.g. `title:string, price:int32`) or leave
  empty for auto-detection (`.*: auto`).
- **What it does**:
  1. Creates the collection schema in Typesense.
  2. Generates and displays a dedicated admin API key with full access (`*`)
     scoped strictly to that collection.

### 🔑 8. Add Key to Typesense Collection

- **Step 1**: Enter target collection name.
- **Step 2**: Enter description for the key.
- **Step 3**: Select access role:
  - **Read-Only Access**: Scoped strictly to `documents:search`.
  - **Admin Access**: Scoped to all actions (`*`) for that collection.
- Displays the generated secret API key on completion.

### 🗑 9. Delete Typesense Collection

- Lists collections with document counts.
- Prompts for confirmation before dropping. All documents in the collection are
  removed.

### 🗑 x. Delete Typesense API Key

- Lists keys by ID, description, collections, and actions (secrets are never
  shown after creation).
- Prompts for confirmation before revocation.

---

## ⚙️ Configuration Reference (.env)

When running locally or in development, `dbpilot` automatically loads
credentials from a `.env` file in the working directory:

```dotenv
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

# Typesense Configuration
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=xyz_typesense_admin_key_123
```

| Variable             | Default Value                 | Description                                         |
| -------------------- | ----------------------------- | --------------------------------------------------- |
| `POSTGRES_HOST`      | `localhost`                   | Host address of PostgreSQL server                   |
| `POSTGRES_PORT`      | `5432`                        | Port exposed by PostgreSQL container                |
| `POSTGRES_USER`      | `postgres`                    | Superuser / root user for administrative operations |
| `POSTGRES_PASSWORD`  | `postgres`                    | Password for PostgreSQL superuser                   |
| `POSTGRES_DB`        | `postgres`                    | Default administrative database to connect to       |
| `TYPESENSE_HOST`     | `localhost`                   | Host address of Typesense server                    |
| `TYPESENSE_PORT`     | `8108`                        | Port exposed by Typesense container                 |
| `TYPESENSE_PROTOCOL` | `http`                        | Connection protocol (`http` or `https`)             |
| `TYPESENSE_API_KEY`  | `xyz_typesense_admin_key_123` | Root / bootstrap admin API key for Typesense        |

---

## 🚀 Automated Release Pipeline

The repository includes an automated GitHub Actions release workflow
([`.github/workflows/release.yml`](.github/workflows/release.yml)) triggered on
**pushes to `main`** or any `v*` tag:

1. **Validation & Packaging**:
   - Runs TypeScript validation (`pnpm run typecheck`).
   - Bundles the application with `esbuild`.
   - Cross-compiles standalone single-file executables via `bun build --compile`
     for:
     - `dbpilot-darwin-arm64` (macOS Apple Silicon)
     - `dbpilot-darwin-x64` (macOS Intel)
     - `dbpilot-linux-arm64` (Linux ARM64 / Graviton / Raspberry Pi)
     - `dbpilot-linux-x64` (Linux x86_64)
     - `dbpilot-windows-x64.exe` (Windows x64)
2. **Integrity Verification**: Generates SHA-256 hashes saved to
   `SHA256SUMS.txt`.
3. **GitHub Release Publishing**: Automatically creates or updates the release
   using the GitHub CLI (`gh release create --latest`), attaching all compiled
   binaries and checksums.
4. **Instant Distribution**: Users can install or update anytime with:
   ```bash
   ```

curl -fsSL
https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash

````
---

## ❓ Troubleshooting

### Connection Refused (PostgreSQL / Typesense)

- Ensure Docker is running: `docker info`.
- Verify containers are active: `docker compose ps`.
- Check if another service is already using port `5432` or `8108`:
```bash
lsof -i :5432
lsof -i :8108
````

- Override the ports using CLI flags if running on custom ports:
  ```bash
  dbpilot --pg-port 5433 --ts-port 8109
  ```

### Reset Local Database State

If you need to completely erase local databases, collections, and keys to start
clean:

```bash
docker compose down -v
docker compose up -d
```
