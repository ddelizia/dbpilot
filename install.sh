#!/usr/bin/env bash
# ==============================================================================
# db-setup CLI Installer Entrypoint
# Repository: https://github.com/ddelizia/db-manager
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -f "${SCRIPT_DIR}/cli/install.sh" ]; then
  exec bash "${SCRIPT_DIR}/cli/install.sh" "$@"
fi

REPO="${REPO:-ddelizia/db-manager}"
BRANCH="${BRANCH:-main}"
exec bash -c "$(curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/cli/install.sh")" bash "$@"
