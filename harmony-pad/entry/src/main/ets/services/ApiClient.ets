import http from '@ohos.net.http';
import router from '@ohos.router';
import { AppConfig } from './AppConfig';
import { TokenStorageService } from './TokenStorageService';
import { RefreshResponse } from '../models/AuthModels';

export interface ApiRequestOptions {
  skipAuth?: boolean;
  skipRefresh?: boolean;
  headers?: ApiHeaders;
}

export interface ApiHeaders {
  'Accept'?: string;
  'Content-Type'?: string;
  Authorization?: string;
}

interface RefreshRequest {
  refreshToken: string;
}

export class ApiError extends Error {
  statusCode: number;
  responseBody: string;
  requestUrl: string;

  constructor(statusCode: number, message: string, responseBody: string = '', requestUrl: string = '') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.requestUrl = requestUrl;
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

  static authHeaders(): ApiHeaders {
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
          throw ApiClient.toThrowable(refreshError, 'Token refresh failed.');
        }
      }

      throw ApiClient.toThrowable(error, 'API request failed.');
    }
  }

  private static async rawRequest<T>(
    method: string,
    path: string,
    body?: object,
    options?: ApiRequestOptions
  ): Promise<T> {
    const request = http.createHttp();
    const headers: ApiHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    ApiClient.applyHeaders(headers, options?.headers);

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
      const requestUrl = ApiClient.buildUrl(path);
      const response = await request.request(requestUrl, requestOptions);
      const statusCode = response.responseCode;
      const responseBody = ApiClient.responseToString(response.result);

      if (statusCode >= 200 && statusCode < 300) {
        if (!responseBody) {
          return ApiClient.emptyResponse<T>();
        }

        return JSON.parse(responseBody) as T;
      }

      throw new ApiError(statusCode, `HTTP ${statusCode}`, responseBody, requestUrl);
    } finally {
      request.destroy();
    }
  }

  private static async refreshAccessToken(): Promise<void> {
    const refreshToken = await TokenStorageService.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, 'Missing refresh token.', '', ApiClient.buildUrl('/auth/refresh'));
    }

    const refreshRequest: RefreshRequest = {
      refreshToken: refreshToken
    };

    const response = await ApiClient.rawRequest<RefreshResponse>(
      'POST',
      '/auth/refresh',
      refreshRequest,
      {
        skipAuth: true,
        skipRefresh: true
      }
    );

    const nextAccessToken = response.accessToken ?? response.data?.accessToken ?? '';
    const nextRefreshToken = response.refreshToken ?? response.data?.refreshToken ?? refreshToken;

    if (!nextAccessToken) {
      throw new ApiError(401, 'Refresh response did not include accessToken.', '', ApiClient.buildUrl('/auth/refresh'));
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

  private static applyHeaders(target: ApiHeaders, source?: ApiHeaders): void {
    if (!source) {
      return;
    }

    if (source.Accept) {
      target.Accept = source.Accept;
    }
    if (source.Authorization) {
      target.Authorization = source.Authorization;
    }
  }

  private static emptyResponse<T>(): T {
    return JSON.parse('{}') as T;
  }

  private static toThrowable(error: Object, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(fallbackMessage);
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
