#!/bin/bash
# Use Node 20.x for Next 12.1.6 compatibility
NODE_BIN="$HOME/.nvm/versions/node/v20.19.6/bin/node"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="node"
fi

"$NODE_BIN" ./node_modules/.bin/next build "$@"
