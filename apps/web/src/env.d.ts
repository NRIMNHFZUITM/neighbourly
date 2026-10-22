interface ImportMetaEnv {
  /** "false" turns off the in-browser sample-data API (once the real API exists). */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
