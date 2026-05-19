/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPI_PUBLIC_KEY: string;
  readonly VITE_TOUR_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
