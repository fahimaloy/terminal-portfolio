#!/bin/bash
# Use the Node version selected by the repository's .nvmrc
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s ".nvmrc" ]; then
  printf 'Missing .nvmrc; cannot select the required Node.js version.\n' >&2
  exit 1
fi
NVM_VERSION="$(tr -d '[:space:]' < .nvmrc)"
NVM_VERSION="${NVM_VERSION#v}"
if [ -z "$NVM_VERSION" ]; then
  printf 'The .nvmrc file does not contain a Node.js version.\n' >&2
  exit 1
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  if ! source "$NVM_DIR/nvm.sh"; then
    printf 'Unable to source nvm from %s.\n' "$NVM_DIR/nvm.sh" >&2
    exit 1
  fi
  if ! nvm use "$NVM_VERSION"; then
    printf 'Unable to select Node.js %s from .nvmrc via nvm.\n' "$NVM_VERSION" >&2
    exit 1
  fi
else
  printf 'nvm is unavailable; using the active Node.js executable if it satisfies %s.\n' "$NVM_VERSION" >&2
fi

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  printf 'No active Node.js executable is available.\n' >&2
  exit 1
fi
NODE_VERSION="$("$NODE_BIN" --version 2>/dev/null || true)"
if [ -z "$NODE_VERSION" ]; then
  printf 'Unable to determine the active Node.js version.\n' >&2
  exit 1
fi
if ! "$NODE_BIN" -e '
  var required = process.argv[1].replace(/^v/, "").split(".").map(Number);
  var active = process.argv[2].replace(/^v/, "").split(".").map(Number);
  function valid(version) {
    return version.length >= 3 && version.every(function (part) { return !isNaN(part); });
  }
  if (!valid(required) || !valid(active) ||
      active[0] < required[0] ||
      (active[0] === required[0] && active[1] < required[1]) ||
      (active[0] === required[0] && active[1] === required[1] && active[2] < required[2])) {
    process.exit(1);
  }
' "$NVM_VERSION" "$NODE_VERSION"; then
  printf 'Node.js %s does not satisfy the required version %s from .nvmrc.\n' "$NODE_VERSION" "$NVM_VERSION" >&2
  exit 1
fi

# Load .env.local if exists
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

"$NODE_BIN" ./node_modules/.bin/next dev "$@"
