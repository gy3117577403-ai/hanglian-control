import http from '@ohos.net.http';
import router from '@ohos.router';
import { AppConfig } from './AppConfig';
import { TokenStorageService } from './TokenStorageService';
import { RefreshResponse } from '../models/AuthModels';

export interface ApiRequestOptions {
  skipAuth?: boolean;
  skipRefresh?: boolean;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(statusCode: number, message: string, responseBody: string = '') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class ApiClient {
  static resolveApiUrl(path: string): string {
    return AppConfig.buildApiUrl(path);
  }

  static resolveAssetUrl(path: string): string {
    return AppConfig.resolveAssetUrl(path);
  }

  static withAccessToken(url: string): string {
    const token = TokenStorageService.getCachedAccessToken();
    if (!token || url.includes('accessToken=')) {
      return url;
    }

    const divider = url.includes('?') ? '&' : '?';
    return `${url}${divider}accessToken=${encodeURIComponent(token)}`;
  }

  static authHeaders(): Record<string, string> {
    const accessToken = TokenStorageService.getCachedAccessToken();
    if (!accessToken) {
      return {};
    }

    return {
      'Authorization': `Bearer ${accessToken}`
    };
  }

  static async getJson<T>(path: string): Promise<T> {
    return ApiClient.get<T>(path);
  }

  static async requestJson<T>(path: string, method: http.RequestMethod = http.RequestMethod.GET, body?: object): Promise<T> {
    return ApiClient.request<T>(ApiClient.methodToString(method), path, body);
  }

  static async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return ApiClient.request<T>('GET', path, undefined, options);
  }

  static async post<T>(path: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return ApiClient.request<T>('POST', path, body, options);
  }

  static async put<T>(path: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return ApiClient.request<T>('PUT', path, body, options);
  }

  static async patch<T>(path: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return ApiClient.request<T>('PATCH', path, body, options);
  }

  static async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return ApiClient.request<T>('DELETE', path, undefined, options);
  }

  private static async request<T>(
    method: string,
    path: string,
    body?: object,
    options?: ApiRequestOptions
  ): Promise<T> {
    try {
      return await ApiClient.rawRequest<T>(method, path, body, options);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401 && !options?.skipAuth && !options?.skipRefresh) {
        try {
          await ApiClient.refreshAccessToken();
          return await ApiClient.rawRequest<T>(method, path, body, options);
        } catch (refreshError) {
          await ApiClient.handleUnauthorized();
          throw refreshError;
        }
      }

      throw error;
    }
  }

  private static async rawRequest<T>(
    method: string,
    path: string,
    body?: object,
    options?: ApiRequestOptions
  ): Promise<T> {
    const request = http.createHttp();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    };

    if (!options?.skipAuth) {
      const accessToken = await TokenStorageService.getAccessToken();
      if (accessToken.length > 0) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    const requestOptions: http.HttpRequestOptions = {
      method: ApiClient.toHttpMethod(method),
      header: headers,
      connectTimeout: AppConfig.REQUEST_TIMEOUT_MS,
      readTimeout: AppConfig.REQUEST_TIMEOUT_MS,
      expectDataType: http.HttpDataType.STRING
    };

    if (body && method !== 'GET') {
      requestOptions.extraData = JSON.stringify(body);
    }

    try {
      const response = await request.request(ApiClient.buildUrl(path), requestOptions);
      const statusCode = response.responseCode;
      const responseBody = ApiClient.responseToString(response.result);

      if (statusCode >= 200 && statusCode < 300) {
        if (!responseBody) {
          return {} as T;
        }

        return JSON.parse(responseBody) as T;
      }

      throw new ApiError(statusCode, `HTTP ${statusCode}`, responseBody);
    } finally {
      request.destroy();
    }
  }

  private static async refreshAccessToken(): Promise<void> {
    const refreshToken = await TokenStorageService.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, 'Missing refresh token.');
    }

    const response = await ApiClient.rawRequest<RefreshResponse>(
      'POST',
      '/auth/refresh',
      { refreshToken },
      {
        skipAuth: true,
        skipRefresh: true
      }
    );

    const nextAccessToken = response.accessToken ?? response.data?.accessToken ?? '';
    const nextRefreshToken = response.refreshToken ?? response.data?.refreshToken ?? refreshToken;

    if (!nextAccessToken) {
      throw new ApiError(401, 'Refresh response did not include accessToken.');
    }

    await TokenStorageService.updateTokens(nextAccessToken, nextRefreshToken);
  }

  private static async handleUnauthorized(): Promise<void> {
    await TokenStorageService.clear();
    router.replaceUrl({
      url: 'pages/LoginPage'
    });
  }

  private static buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return ApiClient.resolveApiUrl(path);
  }

  private static toHttpMethod(method: string): http.RequestMethod {
    switch (method) {
      case 'POST':
        return http.RequestMethod.POST;
      case 'PUT':
        return http.RequestMethod.PUT;
      case 'PATCH':
        return 'PATCH' as http.RequestMethod;
      case 'DELETE':
        return http.RequestMethod.DELETE;
      default:
        return http.RequestMethod.GET;
    }
  }

  private static methodToString(method: http.RequestMethod): string {
    if (method === http.RequestMethod.POST) {
      return 'POST';
    }
    if (method === http.RequestMethod.PUT) {
      return 'PUT';
    }
    if (method === http.RequestMethod.DELETE) {
      return 'DELETE';
    }
    if (`${method}` === 'PATCH') {
      return 'PATCH';
    }
    return 'GET';
  }

  private static responseToString(result: string | ArrayBuffer | object): string {
    if (typeof result === 'string') {
      return result;
    }

    if (result instanceof ArrayBuffer) {
      return '';
    }

    return JSON.stringify(result);
  }
}
