/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PERPLEXITY_API_KEY?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string; // Legacy support
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
