/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dexie Cloud database URL. Leave unset for a local-only build. */
  readonly VITE_DEXIE_CLOUD_URL?: string;
}
