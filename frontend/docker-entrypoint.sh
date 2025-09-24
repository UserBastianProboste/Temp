#!/bin/sh
set -e

LOCKFILE="package-lock.json"
HASH_FILE="node_modules/.package-lock.hash"
REQUIRED_PATHS="node_modules/.bin/vite node_modules/@supabase/supabase-js"

append_reason() {
  if [ -z "$REASONS" ]; then
    REASONS="$1"
  else
    REASONS="$REASONS; $1"
  fi
}

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
  SHOULD_INSTALL=0
  REASONS=""

  if [ ! -d node_modules ]; then
    SHOULD_INSTALL=1
    append_reason "missing node_modules directory"
  fi

  if [ ! -f "$HASH_FILE" ]; then
    SHOULD_INSTALL=1
    append_reason "missing $HASH_FILE"
  else
    SAVED_HASH="$(cat "$HASH_FILE")"
    if [ "$SAVED_HASH" != "$CURRENT_HASH" ]; then
      SHOULD_INSTALL=1
      append_reason "package-lock.json hash changed"
    fi
  fi

  for REQUIRED_PATH in $REQUIRED_PATHS; do
    if [ ! -e "$REQUIRED_PATH" ]; then
      SHOULD_INSTALL=1
      append_reason "missing $REQUIRED_PATH"
    fi
  done

  if [ "$SHOULD_INSTALL" -eq 1 ]; then
    if [ -n "$REASONS" ]; then
      echo "Reinstalando dependencias: $REASONS" >&2
    fi
    npm ci
    mkdir -p node_modules
    echo "$CURRENT_HASH" > "$HASH_FILE"
  fi
fi

exec "$@"
