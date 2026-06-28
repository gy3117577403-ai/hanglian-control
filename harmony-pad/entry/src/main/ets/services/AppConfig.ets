export class AppConfig {
  static readonly API_BASE_URL: string = 'https://sealos-api.example.com/api';
  static readonly API_PREFIX: string = '';
  static readonly ENABLE_MOCK_FALLBACK: boolean = true;
  static readonly REQUEST_TIMEOUT_MS: number = 15000;

  static apiBaseUrl(): string {
    const runtimeValue = AppStorage.Get<string>('API_BASE_URL') ?? AppConfig.API_BASE_URL;
    return AppConfig.trimTrailingSlash(runtimeValue);
  }

  static getApiBaseUrl(): string {
    return AppConfig.apiBaseUrl();
  }

  static setApiBaseUrl(value: string): void {
    AppStorage.SetOrCreate<string>('API_BASE_URL', AppConfig.trimTrailingSlash(value));
  }

  static buildApiUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const baseUrl = AppConfig.apiBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath.startsWith('/api/')) {
      return `${AppConfig.originOf(baseUrl)}${normalizedPath}`;
    }

    const prefix = AppConfig.API_PREFIX.length > 0 ? `/${AppConfig.API_PREFIX.replace(/^\/+|\/+$/g, '')}` : '';
    return `${baseUrl}${prefix}${normalizedPath}`;
  }

  static resolveAssetUrl(path: string): string {
    if (!path) {
      return '';
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const baseUrl = AppConfig.apiBaseUrl();
    if (path.startsWith('/api/')) {
      return `${AppConfig.originOf(baseUrl)}${path}`;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  static trimTrailingSlash(value: string): string {
    let result = value.trim();
    while (result.endsWith('/')) {
      result = result.substring(0, result.length - 1);
    }
    return result.length > 0 ? result : AppConfig.API_BASE_URL;
  }

  private static originOf(baseUrl: string): string {
    const apiIndex = baseUrl.indexOf('/api');
    if (apiIndex > 0) {
      return baseUrl.substring(0, apiIndex);
    }

    const schemeIndex = baseUrl.indexOf('://');
    if (schemeIndex < 0) {
      return baseUrl;
    }

    const pathIndex = baseUrl.indexOf('/', schemeIndex + 3);
    return pathIndex > 0 ? baseUrl.substring(0, pathIndex) : baseUrl;
  }
}
