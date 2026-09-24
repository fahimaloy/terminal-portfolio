#!/bin/bash
# Use the Node version selected by the repository's .nvmrc
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  if [ -s ".nvmrc" ]; then
    nvm use "$(<.nvmrc)" >/dev/null 2>&1 || true
  fi
fi

# Fall back to the active Node executable when nvm is unavailable
NODE_BIN="$(command -v node 2>/dev/null || true)"
NODE_BIN="${NODE_BIN:-node}"

"$NODE_BIN" ./node_modules/.bin/next build "$@"
