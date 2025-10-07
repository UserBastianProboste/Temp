/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_AUTH_DELAY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
