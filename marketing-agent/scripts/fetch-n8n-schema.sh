#!/usr/bin/env bash
# Downloads n8n's own node descriptions (no full n8n install) so validate.mjs can check
# node types, versions and parameters against a real n8n release.
# Usage: bash marketing-agent/scripts/fetch-n8n-schema.sh [n8n-version]   (default 2.46.6)
set -euo pipefail

VERSION="${1:-2.46.6}"
BASE="$(cd "$(dirname "$0")/.." && pwd)/.n8n-schema"
DIR="$BASE/$VERSION"
mkdir -p "$DIR/nodes-base" "$DIR/langchain" "$DIR/wf"
cd "$DIR"

# The node packages are versioned separately from n8n itself: use exactly what this n8n release ships.
WF_VERSION="$(npm view "n8n@$VERSION" dependencies.n8n-workflow)"
BASE_VERSION="$(npm view "n8n@$VERSION" dependencies.n8n-nodes-base)"
LC_VERSION="$(npm view "n8n@$VERSION" 'dependencies.@n8n/n8n-nodes-langchain')"
echo "n8n $VERSION ships n8n-nodes-base $BASE_VERSION, @n8n/n8n-nodes-langchain $LC_VERSION, n8n-workflow $WF_VERSION"

npm pack "n8n-nodes-base@$BASE_VERSION" --silent >/dev/null
tar -xzf "n8n-nodes-base-$BASE_VERSION.tgz" -C nodes-base package/dist/types/nodes.json package/dist/types/credentials.json package/package.json
rm -f "n8n-nodes-base-$BASE_VERSION.tgz"

if [ -n "$LC_VERSION" ] && npm pack "@n8n/n8n-nodes-langchain@$LC_VERSION" --silent >/dev/null 2>&1; then
  tar -xzf "n8n-n8n-nodes-langchain-$LC_VERSION.tgz" -C langchain package/dist/types/nodes.json package/package.json
  rm -f "n8n-n8n-nodes-langchain-$LC_VERSION.tgz"
fi

npm install --prefix "$DIR/wf" --no-save --no-audit --no-fund --ignore-scripts "n8n-workflow@$WF_VERSION" >/dev/null
echo "Schema for n8n $VERSION saved in $DIR"
