#!/usr/bin/env bash
set -euo pipefail
PLUGIN_DIR="$(dirname $(node -p "require.resolve('@arbitrum/hardhat-patch/package.json')"))"
cp -v vendor/arbitrum-hardhat-patch/index.js "$PLUGIN_DIR/dist/index.js"
echo "[ok] applied arbitrum patch to: $PLUGIN_DIR/dist/index.js"
