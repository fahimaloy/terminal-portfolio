#!/bin/bash
# Use Node 20.x for Next 12.1.6 compatibility
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

# Load .env.local if exists
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Use node 20
NODE_BIN="$HOME/.nvm/versions/node/v20.19.6/bin/node"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="node"
fi

"$NODE_BIN" ./node_modules/.bin/next dev "$@"
