/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_DEMO_EMAIL?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
