# ⚡ db-setup-cli

An interactive Terminal User Interface (TUI) with a **Sidebar layout** built with **TypeScript**, **React**, and [**Ink**](https://github.com/vadimdemedes/ink) for managing **PostgreSQL** databases/users and **Typesense** search collections/API keys.

The CLI supports dynamic configuration via **command-line arguments**, `.env` files, and built-in defaults with automatic precedence resolution. The repository includes a ready-to-run **Docker Compose** environment configured with isolated bridge networks for each service, as well as compilation scripts to package the CLI into standalone, cross-platform executables.

---

## 📋 Table of Contents

- [Quick Install (via curl)](#-quick-install-via-curl)
- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Developer Onboarding](#-developer-onboarding)
- [Command-Line Arguments & Flags](#-command-line-arguments--flags)
- [Non-Interactive CLI Commands](#-non-interactive-cli-commands)
- [How to Use the Repo](#-how-to-use-the-repo)
  - [Development Mode](#1-development-mode)
  - [Passing CLI Parameters](#2-passing-cli-parameters)
  - [Production Node Build](#3-production-node-build)
  - [Standalone Binary Builds](#4-standalone-binary-builds)
  - [Type Checking](#5-type-checking)
  - [Docker Management](#6-docker-management)
- [Automated Release Pipeline](#-automated-release-pipeline)
- [TUI Sidebar Navigation & Layout](#-tui-sidebar-navigation--layout)
- [TUI Feature Walkthrough](#-tui-feature-walkthrough)
- [Configuration Reference (.env)](#-configuration-reference-env)
- [Troubleshooting](#-troubleshooting)

## ⚡ Quick Install (via curl)

Install the standalone pre-compiled CLI executable for macOS or Linux directly from the latest GitHub Release:

```bash
curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/cli/install.sh | bash
```

Or using the root shortcut:

```bash
curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/install.sh | bash
```

### Installation Options

You can specify a target release version or a custom installation directory:

```bash
# Install a specific release version
curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/cli/install.sh | bash -s -- --version v1.0.0
# Or using environment variables
VERSION=v1.0.0 curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/cli/install.sh | bash

# Install into a custom directory
INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/cli/install.sh | bash
```

Once installed, both `db-setup` and `db-manager` commands are ready to use:

```bash
db-setup --help
db-setup
```

---

## ✨ Features

- **Split-Pane Sidebar Layout**: Persistent navigation sidebar on the left, active view/wizard on the right, and live system health status.
- **Dual Configuration Modes**: Configure credentials via `.env` file or directly override them via CLI parameters (`--pg-host`, `--ts-port`, etc.).
- **Interactive Forms**: Arrow-key navigation, real-time spinners, input forms, and masked password fields powered by React and Ink.
- **PostgreSQL Management**:
  - Browse databases and their non-system schemas.
  - Create new databases with a dedicated owner/admin user.
  - Provision database-scoped users with granular permissions on schemas, tables, and sequences.
  - Delete databases (terminates open connections first) and drop login roles.
- **Typesense Management**:
  - List search collections, document counts, and schema field types.
  - Create collections with custom or auto-inferred schema fields.
  - Generate scoped API keys for collections (Full Admin `*` or Read-Only `documents:search`).
  - Delete collections and revoke API keys.
- **Non-interactive CLI**: Every TUI action is also available as a `db-setup pg …` / `db-setup ts …` command.
- **Network Isolation**: Docker Compose sets up independent bridge networks (`postgres_network` and `typesense_network`) with healthchecks.
- **Zero-Dependency Native Binaries**: Pre-compiled single-file binaries for macOS (ARM/Intel), Linux (ARM/x64), and Windows (x64) via Bun and esbuild.

---

## 🛠 Architecture & Tech Stack

- **Language**: TypeScript (ESM)
- **TUI Framework**: [Ink 5](https://github.com/vadimdemedes/ink) & React 18
- **CLI Parsing**: `node:util` `parseArgs` (zero external dependencies, fully compatible with Node 20+ and Bun)
- **Clients**:
  - [`pg`](https://node-postgres.com/) for PostgreSQL connection and DDL/DCL execution
  - [`typesense`](https://typesense.org/docs/) client for cluster health, collection management, and API key provisioning
- **Bundler & Compiler**:
  - [`tsx`](https://github.com/privatenumber/tsx) for fast dev execution without explicit transpile steps
  - [`esbuild`](https://esbuild.github.io/) for bundling
  - [`bun build --compile`](https://bun.sh/docs/bundler/executables) for cross-compiling standalone native binaries
- **Containers**: Docker Compose running PostgreSQL 16 (Alpine) and Typesense 27.1

---

## 📂 Project Structure

```text
db-setup/
├── bin/                          # Compiled cross-platform standalone binaries
│   ├── db-setup-darwin-arm64     # macOS Apple Silicon
│   ├── db-setup-darwin-x64       # macOS Intel
│   ├── db-setup-linux-arm64      # Linux ARM64
│   ├── db-setup-linux-x64        # Linux x86_64
│   └── db-setup-windows-x64.exe  # Windows x64
├── dist/                         # Compiled JavaScript output (from tsc / esbuild)
│   ├── bundle.mjs                # Bundled ESM output for packaging
│   └── cli.js                    # Node entrypoint
├── src/
│   ├── cli.tsx                   # Main TUI entrypoint, focus router, and app layout
│   ├── commands.ts               # Non-interactive CLI command dispatcher
│   ├── config.ts                 # CLI argument parser, .env loader, and config store
│   ├── components/
│   │   ├── Header.tsx            # Banner with active PG/TS endpoints and sources
│   │   ├── Sidebar.tsx           # Split-pane sidebar navigation & live status
│   │   ├── Footer.tsx            # Context-sensitive keyboard shortcut hints
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
│   │   ├── postgres.ts           # PostgreSQL connection, queries, and role grants
│   │   └── typesense.ts          # Typesense API client and key management
│   └── shims/
│       └── devtools.ts           # React DevTools stub for standalone binary compilation
├── .env.example                  # Template for environment variables
├── docker-compose.yml            # PostgreSQL 16 & Typesense 27.1 services
├── package.json                  # Scripts and dependencies
├── tsconfig.json                 # TypeScript compiler configuration
└── pnpm-lock.yaml                # Lockfile
```

---

## 📦 Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or higher (`v24.x` tested)
- **pnpm**: `v9.x` or higher (`v10.x` tested)
- **Docker & Docker Compose**: Docker 24+ with Compose v2
- **Bun** *(Optional)*: `v1.1+` (only required if you want to run `pnpm run build:bin` to build native single-file binaries)

---

## 🚀 Developer Onboarding

Follow these steps to set up the project on your local machine:

### 1. Clone the repository

```bash
git clone <repository-url>
cd db-setup
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables (optional if using defaults or CLI flags)

Copy the example `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

The defaults match the credentials defined in [docker-compose.yml](file:///Users/ddelizia/projects/db-setup/docker-compose.yml):

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

### 4. Start the database containers

Spin up both PostgreSQL and Typesense in the background:

```bash
docker compose up -d
```

Verify that the containers are running:

```bash
docker compose ps
```

### 5. Launch the TUI

```bash
pnpm start
```

---

## ⚙️ Command-Line Arguments & Flags

The CLI accepts arguments that override `.env` and default values.

### Available Options

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--pg-host <host>` | `-H` | `localhost` | PostgreSQL host address |
| `--pg-port <port>` | `-p` | `5432` | PostgreSQL port |
| `--pg-user <user>` | `-u` | `postgres` | PostgreSQL administrative username |
| `--pg-password <pass>` | | `postgres` | PostgreSQL administrative password |
| `--pg-pass <pass>` | | `postgres` | Alias for `--pg-password` |
| `--pg-db <database>` | `-d` | `postgres` | Default PostgreSQL database to connect to |
| `--ts-host <host>` | | `localhost` | Typesense host address |
| `--ts-port <port>` | | `8108` | Typesense port |
| `--ts-protocol <proto>` | | `http` | Typesense protocol (`http` or `https`) |
| `--ts-api-key <key>` | | `xyz_...` | Typesense admin API key |
| `--ts-key <key>` | | `xyz_...` | Alias for `--ts-api-key` |
| `--db <name>` | | | Target database for `pg` commands |
| `--username <user>` | | | Target role for `pg` create/add/delete-user |
| `--password <pass>` | | | Password for the target role (not the admin `--pg-password`) |
| `--collection <name>` | | | Target collection for `ts` commands |
| `--fields <spec>` | | | Schema fields, e.g. `title:string, price:int32` |
| `--description <text>` | | | API key description (`--desc` alias) |
| `--role <role>` | | | `admin` or `read-only` (default: `read-only`) |
| `--id <id>` | | | Typesense API key id |
| `--yes` | `-y` | | Skip confirmation on destructive commands |
| `--help` | `-h` | | Show help screen and exit |
| `--version` | `-v` | | Show version number and exit |

### Configuration Precedence Order

When resolving configuration settings, the CLI uses the following priority:

1. **CLI Arguments** *(highest priority)*: e.g. `--pg-port 5433`
2. **Environment Variables**: e.g. `POSTGRES_PORT` in `.env` or current shell
3. **Built-in Defaults** *(lowest priority)*: e.g. `5432`

---

## ⌨️ Non-Interactive CLI Commands

Running `db-setup` with no command still launches the TUI. Passing a command runs the same operations without the interface.

```bash
db-setup status
db-setup pg --help
db-setup ts --help
```

### PostgreSQL

| Command | TUI equivalent |
| --- | --- |
| `db-setup pg list` | View Schemas |
| `db-setup pg list-users` | (used by Delete User) |
| `db-setup pg create-db <name> --username <user> --password <pass>` | Create DB & Admin |
| `db-setup pg add-user <db> --username <user> --password <pass>` | Add DB User |
| `db-setup pg delete-db <name> --yes` | Delete DB |
| `db-setup pg delete-user <username> --yes` | Delete User |

```bash
pnpm start -- pg list
pnpm start -- pg create-db shop --username shop_admin --password s3cret
pnpm start -- pg add-user shop --username reporter --password s3cret
pnpm start -- pg delete-user reporter --yes
pnpm start -- pg delete-db shop --yes
```

`delete-db` refuses `template0` / `template1` and the currently connected database (`--pg-db`). `delete-user` refuses the connected admin user and roles that still own databases.

### Typesense

| Command | TUI equivalent |
| --- | --- |
| `db-setup ts list` | View Collections |
| `db-setup ts list-keys` | (used by Delete Key) |
| `db-setup ts create-collection <name> [--fields "title:string, price:int32"] [--description <text>]` | Create Col & Key |
| `db-setup ts add-key <collection> [--description <text>] [--role admin\|read-only]` | Add Col Key |
| `db-setup ts delete-collection <name> --yes` | Delete Collection |
| `db-setup ts delete-key <id> --yes` | Delete Key |

```bash
pnpm start -- ts list
pnpm start -- ts list-keys
pnpm start -- ts create-collection products --fields "title:string, price:int32"
pnpm start -- ts add-key products --description "search" --role read-only
pnpm start -- ts delete-collection products --yes
pnpm start -- ts delete-key 12 --yes
```

Destructive commands require `-y` / `--yes`. Created Typesense key secrets are printed once and cannot be retrieved later.

---

## 💻 How to Use the Repo

### 1. Development Mode

Run the CLI directly through `tsx` (loads `.env` automatically):

```bash
pnpm start
```

### 2. Passing CLI Parameters

You can pass command-line options directly in development or production mode:

```bash
# In development via pnpm / tsx:
pnpm start -- --pg-host 127.0.0.1 --pg-port 5432 --ts-port 8108

# Connecting to custom / remote databases:
pnpm start -- -H staging-db.internal -p 5432 -u admin -d analytics

# With pre-built node script:
node dist/cli.js --pg-port 5433 --ts-host search.company.com

# With compiled native binary:
./bin/db-setup-darwin-arm64 --pg-host 127.0.0.1 -p 5432
```

### 3. Production Node Build

To compile TypeScript to ESM JavaScript in `dist/`:

```bash
pnpm run build
```

You can then run the built CLI:

```bash
node dist/cli.js
```

Or link it globally:

```bash
pnpm link --global
db-setup --help
```

### 4. Standalone Binary Builds

To compile zero-dependency native binaries for all major platforms (macOS ARM/x64, Linux ARM/x64, Windows x64):

```bash
pnpm run build:bin
```

This packages the application and the `devtools` shim into single standalone executables:

```bash
# macOS Apple Silicon (M1/M2/M3/M4)
./bin/db-setup-darwin-arm64

# Linux x86_64
./bin/db-setup-linux-x64
```

### 5. Type Checking

Validate TypeScript types without emitting files:

```bash
pnpm run typecheck
```

### 6. Docker Management

| Action | Command |
| --- | --- |
| Start services | `docker compose up -d` |
| View service logs | `docker compose logs -f` |
| View Postgres logs only | `docker compose logs -f postgres` |
| View Typesense logs only | `docker compose logs -f typesense` |
| Stop services | `docker compose stop` |
| Stop and remove containers | `docker compose down` |
| Reset all data (erase volumes) | `docker compose down -v` |

---

## 🚀 Automated Release Pipeline

The repository includes a fully automated GitHub Actions release pipeline ([`.github/workflows/release.yml`](.github/workflows/release.yml)) triggered on **every push to `main`** or any `v*` tag:

1. **Validation & Packaging**:
   - Runs TypeScript validation (`pnpm run typecheck`).
   - Bundles the application with `esbuild`.
   - Cross-compiles standalone single-file executables via `bun build --compile` for:
     - `db-setup-darwin-arm64` (macOS Apple Silicon)
     - `db-setup-darwin-x64` (macOS Intel)
     - `db-setup-linux-arm64` (Linux ARM64 / Graviton / Raspberry Pi)
     - `db-setup-linux-x64` (Linux x86_64)
     - `db-setup-windows-x64.exe` (Windows x64)
2. **Integrity Verification**:
   - Generates SHA-256 hashes saved to `SHA256SUMS.txt`.
3. **GitHub Release Management**:
   - Automatically determines release tag (`v<version>` from `package.json`, or `v<version>.<run_number>` on subsequent pushes).
   - Creates or updates the release using GitHub CLI (`gh release create --latest`), attaching all compiled binaries and checksums.
4. **Instant Distribution**:
   - Release assets become immediately available via the curl installation script:
     ```bash
     curl -fsSL https://raw.githubusercontent.com/ddelizia/db-manager/main/cli/install.sh | bash
     ```

---

## 🧭 TUI Sidebar Navigation & Layout

The TUI features a split-pane layout with persistent sidebar navigation on the left and dynamic content on the right:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ POSTGRES & TYPESENSE TUI MANAGER                                            v1.0.0  │
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

### Keyboard Shortcuts

- **`↑` / `↓`** (or **`k` / `j`**): Move selection up and down in the sidebar.
- **`0` - `9`** and **`x`**: Jump directly to any view from the sidebar.
- **`Enter`** or **`→`**: Select an action and transfer keyboard focus into the content view.
- **`Tab`**: Switch focus between the Sidebar and the Content View.
- **`Esc`**: Return focus from the content view back to the Sidebar.
- **`r`**: Refresh live connection status.
- **`q`** / **`Ctrl+C`**: Quit the application.

---

## 🎮 TUI Feature Walkthrough

### 🏠 0. Overview & Health Dashboard
- Displays active connection targets for PostgreSQL and Typesense.
- Shows real-time connection status badges (`● Connected` / `● Disconnected`).
- Highlights the **configuration source** for each parameter (`[CLI Flag]`, `[.env]`, or `[default]`).

### 🐘 1. View PostgreSQL Database Schemas
- Queries the PostgreSQL instance for all non-template databases.
- Lists each database alongside all active schemas (excluding internal catalogs like `pg_catalog` and `information_schema`).

### ➕ 2. Create New PostgreSQL Database & Admin User
- **Step 1**: Enter the new database name.
- **Step 2**: Enter the new admin username.
- **Step 3**: Enter the admin password (masked with `*`).
- **What it does**:
  1. Creates the user role in PostgreSQL if not already present.
  2. Creates the database with the user set as `OWNER`.
  3. Grants all privileges on the database and sets the user as owner of the `public` schema.

### 👤 3. Add User to PostgreSQL Database
- **Step 1**: Enter target database name.
- **Step 2**: Enter username.
- **Step 3**: Enter password.
- **What it does**:
  1. Creates the role with password.
  2. Grants `CONNECT` and `ALL PRIVILEGES` on the specified database.
  3. Grants full permissions and default privileges on all schemas, tables, and sequences within that specific database only.

### ⚡ 4. View Typesense Collections
- Connects to the Typesense cluster and retrieves all collections.
- Displays collection names, total document counts, and schema field definitions with types and optionality flags.

### ➕ 5. Create New Typesense Collection & Admin Key
- **Step 1**: Enter the collection name.
- **Step 2**: Enter a key description or owner name.
- **Step 3**: Define schema fields (e.g. `title:string, price:int32`) or leave empty for auto-detection (`.*: auto`).
- **What it does**:
  1. Creates the collection schema in Typesense.
  2. Generates and displays a dedicated admin API key with full access (`*`) scoped strictly to that collection.

### 🔑 8. Add Key/User to Typesense Collection
- **Step 1**: Enter target collection name.
- **Step 2**: Enter description for the key.
- **Step 3**: Select access role:
  - **Read-Only Access**: Scoped strictly to `documents:search`.
  - **Admin Access**: Scoped to all actions (`*`) for that collection.
- Displays the generated secret API key on completion.

### 🗑 4. Delete PostgreSQL Database
- Lists non-template databases.
- Confirm before drop. Open connections to the target database are terminated first.
- Refuses `template0`, `template1`, and the currently connected database.

### 🗑 5. Delete PostgreSQL User
- Lists login roles except the connected admin user.
- Confirm before drop. Roles that still own databases must have those databases deleted first.

### 🗑 9. Delete Typesense Collection
- Lists collections with document counts.
- Confirm before drop. All documents in the collection are removed. Scoped API keys are left in place.

### 🗑 x. Delete Typesense API Key
- Lists keys by id, description, collections, and actions (secrets are never shown after creation).
- Confirm before revoke.

---

## ⚙️ Configuration Reference (.env)

| Variable | Default Value | Description |
| --- | --- | --- |
| `POSTGRES_HOST` | `localhost` | Host address of PostgreSQL server |
| `POSTGRES_PORT` | `5432` | Port exposed by PostgreSQL container |
| `POSTGRES_USER` | `postgres` | Superuser / root user for administrative operations |
| `POSTGRES_PASSWORD` | `postgres` | Password for PostgreSQL superuser |
| `POSTGRES_DB` | `postgres` | Default administrative database to connect to |
| `TYPESENSE_HOST` | `localhost` | Host address of Typesense server |
| `TYPESENSE_PORT` | `8108` | Port exposed by Typesense container |
| `TYPESENSE_PROTOCOL` | `http` | Connection protocol (`http` or `https`) |
| `TYPESENSE_API_KEY` | `xyz_typesense_admin_key_123` | Root / bootstrap admin API key for Typesense |

---

## ❓ Troubleshooting

### Connection Refused (PostgreSQL / Typesense)
- Ensure Docker is running: `docker info`.
- Verify containers are active: `docker compose ps`.
- Check if another service is already using port `5432` or `8108` on your host machine:
  ```bash
  lsof -i :5432
  lsof -i :8108
  ```
- Override the ports using CLI flags if running on non-default ports:
  ```bash
  pnpm start -- --pg-port 5433 --ts-port 8109
  ```

### Clean Slate / Reset All Data
If you need to completely purge local databases, collections, and keys:
```bash
docker compose down -v
docker compose up -d
```
