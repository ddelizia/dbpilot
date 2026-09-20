#!/usr/bin/env bash
# ==============================================================================
# dbpilot CLI Installer
# Repository: https://github.com/ddelizia/dbpilot
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash
#
# Custom options:
#   curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --version v1.0.0
#   curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash -s -- --uninstall
#   VERSION=v1.0.0 curl -fsSL https://raw.githubusercontent.com/ddelizia/dbpilot/main/cli/install.sh | bash
#   INSTALL_DIR=/usr/local/bin curl -fsSL ... | bash
# ==============================================================================

set -euo pipefail

REPO="${REPO:-ddelizia/dbpilot}"
CLI_NAME="dbpilot"
ALT_NAME="db-setup"
VERSION="${VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-}"
LOCAL_BIN_DIR="${LOCAL_BIN_DIR:-}"
UNINSTALL=false

# Text formatting
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD="\033[1m"
  GREEN="\033[32m"
  BLUE="\033[34m"
  YELLOW="\033[33m"
  RED="\033[31m"
  CYAN="\033[36m"
  RESET="\033[0m"
else
  BOLD=""
  GREEN=""
  BLUE=""
  YELLOW=""
  RED=""
  CYAN=""
  RESET=""
fi

log_info() {
  echo -e "${BLUE}==>${RESET} ${BOLD}$1${RESET}"
}

log_success() {
  echo -e "${GREEN}✓${RESET} ${BOLD}$1${RESET}"
}

log_warn() {
  echo -e "${YELLOW}!${RESET} $1"
}

log_error() {
  echo -e "${RED}✗ Error:${RESET} $1" >&2
}

print_help() {
  cat <<EOF
dbpilot CLI Installer

Usage:
  install.sh [options]

Options:
  -v, --version <ver>      Version to install (e.g., 'latest' or 'v1.0.0', default: latest)
  -d, --dir <path>         Target directory for installation (default: /usr/local/bin or ~/.local/bin)
  -r, --repo <owner/repo>  GitHub repository (default: ddelizia/dbpilot)
  --local <dir>            Install from a local binary directory (skips download)
  -u, --uninstall          Remove dbpilot and its aliases instead of installing
  -h, --help               Show this help message

Environment Variables:
  VERSION                  Version to install
  INSTALL_DIR              Installation directory
  REPO                     GitHub repository
  LOCAL_BIN_DIR            Local binary directory for offline installation
EOF
}

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    -d|--dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    -r|--repo)
      REPO="$2"
      shift 2
      ;;
    --local)
      LOCAL_BIN_DIR="$2"
      shift 2
      ;;
    -u|--uninstall)
      UNINSTALL=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

echo -e "${BOLD}${CYAN}"
cat << "BANNER"
 ____  ____  ____  ___ _      ___  _____ 
|  _ \| __ )|  _ \|_ _| |    / _ \|_   _|
| | | ||  _ \| |_) || || |   | | | | | |  
| |_| || |_) |  __/ | || |___| |_| | | |  
|____/ |____/|_|   |___|_____|\___/  |_|  
BANNER
echo -e "${RESET}"
if [ "$UNINSTALL" = true ]; then
  log_info "Uninstalling ${CLI_NAME}..."
else
  log_info "Installing ${CLI_NAME} (${VERSION}) from ${REPO}..."
fi

# 1. Detect Operating System
OS="$(uname -s)"
case "$OS" in
  Darwin)
    OS_TYPE="darwin"
    ;;
  Linux)
    OS_TYPE="linux"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    OS_TYPE="windows"
    ;;
  *)
    log_error "Unsupported operating system: $OS"
    exit 1
    ;;
esac

# 2. Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)
    ARCH_TYPE="x64"
    ;;
  arm64|aarch64)
    ARCH_TYPE="arm64"
    ;;
  *)
    log_error "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# 3. Formulate binary filename
if [ "$OS_TYPE" = "windows" ]; then
  FILE_NAME="${CLI_NAME}-${OS_TYPE}-${ARCH_TYPE}.exe"
  TARGET_BIN="${CLI_NAME}.exe"
  TARGET_ALT_BIN="${ALT_NAME}.exe"
else
  FILE_NAME="${CLI_NAME}-${OS_TYPE}-${ARCH_TYPE}"
  TARGET_BIN="${CLI_NAME}"
  TARGET_ALT_BIN="${ALT_NAME}"
fi

log_info "Detected platform: ${OS_TYPE}-${ARCH_TYPE} -> binary: ${FILE_NAME}"

can_write_dir() {
  local dir="$1"
  while [ ! -d "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ]; do
    dir="$(dirname "$dir")"
  done
  [ -w "$dir" ]
}

# 4. Resolve Target Installation Directory
USE_SUDO=false

if [ -n "$INSTALL_DIR" ]; then
  TARGET_DIR="$INSTALL_DIR"
  if ! can_write_dir "$TARGET_DIR" && [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
      USE_SUDO=true
    else
      log_error "Target directory '$TARGET_DIR' is not writable and sudo is unavailable."
      exit 1
    fi
  fi
elif [ "$UNINSTALL" = true ]; then
  if [ -e "/usr/local/bin/$TARGET_BIN" ] || [ -L "/usr/local/bin/$TARGET_BIN" ] || \
     [ -e "/usr/local/bin/db-setup" ] || [ -L "/usr/local/bin/db-setup" ] || \
     [ -e "/usr/local/bin/db-manager" ] || [ -L "/usr/local/bin/db-manager" ]; then
    TARGET_DIR="/usr/local/bin"
  else
    TARGET_DIR="$HOME/.local/bin"
  fi
  if ! can_write_dir "$TARGET_DIR" && [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
      USE_SUDO=true
    else
      log_error "Target directory '$TARGET_DIR' is not writable and sudo is unavailable."
      exit 1
    fi
  fi
else
  # Auto-select best directory
  if can_write_dir "/usr/local/bin" || [ "$(id -u)" -eq 0 ]; then
    TARGET_DIR="/usr/local/bin"
  elif [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
    TARGET_DIR="$HOME/.local/bin"
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    TARGET_DIR="/usr/local/bin"
    USE_SUDO=true
  else
    TARGET_DIR="$HOME/.local/bin"
  fi
fi

if [ "$UNINSTALL" = true ]; then
  log_info "Uninstalling ${CLI_NAME} from ${TARGET_DIR}..."
  if [ "$USE_SUDO" = true ]; then
    sudo rm -f \
      "$TARGET_DIR/$TARGET_BIN" \
      "$TARGET_DIR/$TARGET_ALT_BIN" \
      "$TARGET_DIR/db-manager"
  else
    rm -f \
      "$TARGET_DIR/$TARGET_BIN" \
      "$TARGET_DIR/$TARGET_ALT_BIN" \
      "$TARGET_DIR/db-manager"
  fi
  log_success "${CLI_NAME} and its aliases removed from ${TARGET_DIR}"
  exit 0
fi

# 5. Create temporary work directory
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'dbpilot')"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

# 6. Retrieve Binary (Local or Remote)
if [ -n "$LOCAL_BIN_DIR" ]; then
  SRC_FILE="${LOCAL_BIN_DIR}/${FILE_NAME}"
  if [ ! -f "$SRC_FILE" ]; then
    # Check fallback name in local directory
    ALT_SRC_FILE="${LOCAL_BIN_DIR}/${ALT_NAME}-${OS_TYPE}-${ARCH_TYPE}${EXT:-}"
    if [ -f "$ALT_SRC_FILE" ]; then
      SRC_FILE="$ALT_SRC_FILE"
    else
      log_error "Local binary not found at: $SRC_FILE"
      exit 1
    fi
  fi
  log_info "Using local binary from ${SRC_FILE}..."
  cp "$SRC_FILE" "$TMP_DIR/$FILE_NAME"
else
  # Determine GitHub release URLs
  if [ "$VERSION" = "latest" ]; then
    BASE_URL="https://github.com/${REPO}/releases/latest/download"
  else
    BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"
  fi

  BIN_URL="${BASE_URL}/${FILE_NAME}"
  SUM_URL="${BASE_URL}/SHA256SUMS.txt"

  log_info "Downloading ${FILE_NAME} from GitHub Releases..."
  log_info "URL: ${BIN_URL}"

  DOWNLOAD_SUCCESS=false
  if curl -fSL --progress-bar "$BIN_URL" -o "$TMP_DIR/$FILE_NAME"; then
    DOWNLOAD_SUCCESS=true
  else
    # Fallback to legacy binary name for backwards compatibility
    if [ "$OS_TYPE" = "windows" ]; then
      LEGACY_NAME="db-setup-${OS_TYPE}-${ARCH_TYPE}.exe"
    else
      LEGACY_NAME="db-setup-${OS_TYPE}-${ARCH_TYPE}"
    fi
    LEGACY_URL="${BASE_URL}/${LEGACY_NAME}"
    log_info "Binary ${FILE_NAME} not found on release, trying legacy asset ${LEGACY_NAME}..."
    if curl -fSL --progress-bar "$LEGACY_URL" -o "$TMP_DIR/$FILE_NAME"; then
      DOWNLOAD_SUCCESS=true
    fi
  fi

  if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo ""
    log_error "Failed to download binary from ${BIN_URL}"
    echo -e "  Please verify that a release exists at: ${CYAN}https://github.com/${REPO}/releases${RESET}" >&2
    exit 1
  fi

  # Optional Checksum Verification
  if curl -fsSL "$SUM_URL" -o "$TMP_DIR/SHA256SUMS.txt" 2>/dev/null; then
    log_info "Verifying SHA-256 checksum..."
    EXPECTED_HASH=$(grep -E "[[:space:]](${FILE_NAME}|${LEGACY_NAME:-})$" "$TMP_DIR/SHA256SUMS.txt" | awk '{print $1}' | head -n 1 || true)

    if [ -n "$EXPECTED_HASH" ]; then
      ACTUAL_HASH=""
      if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(sha256sum "$TMP_DIR/$FILE_NAME" | awk '{print $1}')
      elif command -v shasum >/dev/null 2>&1; then
        ACTUAL_HASH=$(shasum -a 256 "$TMP_DIR/$FILE_NAME" | awk '{print $1}')
      fi

      if [ -n "$ACTUAL_HASH" ]; then
        if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
          log_error "Checksum verification failed!"
          echo "  Expected: $EXPECTED_HASH" >&2
          echo "  Actual:   $ACTUAL_HASH" >&2
          exit 1
        fi
        log_success "Checksum verified: ${ACTUAL_HASH:0:16}..."
      fi
    fi
  fi
fi

# 7. Install Binary and Create Symlink
log_info "Installing to ${TARGET_DIR}..."

if [ "$USE_SUDO" = true ]; then
  sudo mkdir -p "$TARGET_DIR"
  sudo cp "$TMP_DIR/$FILE_NAME" "$TARGET_DIR/$TARGET_BIN"
  sudo chmod +x "$TARGET_DIR/$TARGET_BIN"
  
  # Also create alias symlinks (db-setup, db-manager) -> dbpilot
  sudo ln -sf "$TARGET_DIR/$TARGET_BIN" "$TARGET_DIR/db-setup" 2>/dev/null || true
  sudo ln -sf "$TARGET_DIR/$TARGET_BIN" "$TARGET_DIR/db-manager" 2>/dev/null || true
else
  mkdir -p "$TARGET_DIR"
  cp "$TMP_DIR/$FILE_NAME" "$TARGET_DIR/$TARGET_BIN"
  chmod +x "$TARGET_DIR/$TARGET_BIN"

  # Also create alias symlinks (db-setup, db-manager) -> dbpilot
  ln -sf "$TARGET_DIR/$TARGET_BIN" "$TARGET_DIR/db-setup" 2>/dev/null || true
  ln -sf "$TARGET_DIR/$TARGET_BIN" "$TARGET_DIR/db-manager" 2>/dev/null || true
fi

log_success "${CLI_NAME} installed to ${TARGET_DIR}/${TARGET_BIN}"
log_success "Aliases configured: db-setup, db-manager -> ${TARGET_BIN}"

# 8. Check PATH configuration
IS_IN_PATH=false
case ":$PATH:" in
  *":$TARGET_DIR:"*)
    IS_IN_PATH=true
    ;;
esac

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
log_success "Installation complete!"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [ "$IS_IN_PATH" = false ]; then
  echo ""
  log_warn "${BOLD}${TARGET_DIR}${RESET} is not in your current PATH."
  echo "  To use '${CLI_NAME}' from any directory, add it to your profile:"
  
  CURRENT_SHELL="$(basename "${SHELL:-bash}")"
  case "$CURRENT_SHELL" in
    zsh)
      echo -e "    ${CYAN}echo 'export PATH=\"${TARGET_DIR}:\$PATH\"' >> ~/.zshrc && source ~/.zshrc${RESET}"
      ;;
    bash)
      echo -e "    ${CYAN}echo 'export PATH=\"${TARGET_DIR}:\$PATH\"' >> ~/.bashrc && source ~/.bashrc${RESET}"
      ;;
    fish)
      echo -e "    ${CYAN}fish_add_path ${TARGET_DIR}${RESET}"
      ;;
    *)
      echo -e "    ${CYAN}export PATH=\"${TARGET_DIR}:\$PATH\"${RESET}"
      ;;
  esac
fi

echo ""
echo "🚀 Quick Start:"
echo -e "  Run interactive TUI:         ${CYAN}${CLI_NAME}${RESET}"
echo -e "  Check service status:        ${CYAN}${CLI_NAME} status${RESET}"
echo -e "  Postgres administration:     ${CYAN}${CLI_NAME} pg list${RESET}"
echo -e "  Typesense administration:    ${CYAN}${CLI_NAME} ts list${RESET}"
echo -e "  View help and options:       ${CYAN}${CLI_NAME} --help${RESET}"
echo ""
