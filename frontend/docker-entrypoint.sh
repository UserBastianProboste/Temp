#!/bin/sh
set -e

LOCKFILE="package-lock.json"
HASH_FILE="node_modules/.package-lock.hash"
REQUIRED_PATHS="node_modules/.bin/vite node_modules/@supabase/supabase-js node_modules/@mui/icons-material node_modules/@mui/material node_modules/@emotion/react node_modules/@emotion/styled"
EXTRA_MODULES="@mui/material @emotion/react @emotion/styled @mui/icons-material"

write_hash() {
  mkdir -p "$(dirname "$HASH_FILE")"
  if [ -f "$LOCKFILE" ]; then
    sha256sum "$LOCKFILE" | awk '{ print $1 }' > "$HASH_FILE"
  else
    sha256sum package.json | awk '{ print $1 }' > "$HASH_FILE"
  fi
}

install_additional_modules() {
  if [ -n "$EXTRA_MODULES" ]; then
    echo "Instalando módulos adicionales requeridos: $EXTRA_MODULES" >&2
    npm install $EXTRA_MODULES
  fi
}

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
  install_additional_modules
  mkdir -p node_modules
  write_hash
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
    install_additional_modules
    mkdir -p node_modules
    write_hash
  fi
fi

exec "$@"
