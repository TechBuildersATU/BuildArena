interface ImportMetaEnv {
  /** "1" keeps the test-only URL flags in a production build (E2E against `vite preview`). */
  readonly VITE_TEST_FLAGS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
