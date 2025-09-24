#!/bin/sh
set -e

LOCKFILE="package-lock.json"
HASH_FILE="node_modules/.package-lock.hash"

if [ ! -f "$LOCKFILE" ]; then
  echo "No se encontró $LOCKFILE; ejecutando npm install" >&2
  npm install
  mkdir -p node_modules
  if [ -f "$LOCKFILE" ]; then
    sha256sum "$LOCKFILE" | awk '{ print $1 }' > "$HASH_FILE"
  else
    sha256sum package.json | awk '{ print $1 }' > "$HASH_FILE"
  fi
else
  CURRENT_HASH="$(sha256sum "$LOCKFILE" | awk '{ print $1 }')"
  if [ ! -d node_modules ] || [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE")" != "$CURRENT_HASH" ]; then
    npm ci
    mkdir -p node_modules
    echo "$CURRENT_HASH" > "$HASH_FILE"
  fi
fi

exec "$@"
