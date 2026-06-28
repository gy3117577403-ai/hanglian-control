export {};

declare global {
  interface Window {
    __HANGLIAN_RUNTIME_CONFIG__?: {
      API_BASE_URL?: string;
      APP_ENV?: string;
      STORAGE_MODE?: string;
    };
    __HANG_LIAN_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}
