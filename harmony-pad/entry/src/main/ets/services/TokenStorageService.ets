import common from '@ohos.app.ability.common';
import preferences from '@ohos.data.preferences';
import { AuthState, UserInfo } from '../models/AuthModels';

export class TokenStorageService {
  private static readonly STORE_NAME: string = 'hanglian_auth';
  private static readonly ACCESS_TOKEN_KEY: string = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY: string = 'refreshToken';
  private static readonly USER_INFO_KEY: string = 'userInfo';
  private static readonly CACHED_ACCESS_TOKEN_KEY: string = 'ACCESS_TOKEN';
  private static readonly CACHED_REFRESH_TOKEN_KEY: string = 'REFRESH_TOKEN';
  private static readonly CACHED_USER_INFO_KEY: string = 'USER_INFO';

  private static appContext?: common.Context;
  private static store?: preferences.Preferences;

  static init(context: common.Context): void {
    TokenStorageService.appContext = context;
  }

  private static async getStore(): Promise<preferences.Preferences> {
    if (TokenStorageService.store) {
      return TokenStorageService.store;
    }

    if (!TokenStorageService.appContext) {
      throw new Error('TokenStorageService has not been initialized.');
    }

    const options: preferences.Options = {
      name: TokenStorageService.STORE_NAME
    };
    TokenStorageService.store = await preferences.getPreferences(TokenStorageService.appContext, options);
    return TokenStorageService.store;
  }

  static async saveAuthState(authState: AuthState): Promise<void> {
    const store = await TokenStorageService.getStore();
    await store.put(TokenStorageService.ACCESS_TOKEN_KEY, authState.accessToken);
    await store.put(TokenStorageService.REFRESH_TOKEN_KEY, authState.refreshToken);
    await store.put(TokenStorageService.USER_INFO_KEY, JSON.stringify(authState.userInfo));
    await store.flush();
    TokenStorageService.cacheAuthState(authState);
  }

  static async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    const store = await TokenStorageService.getStore();
    await store.put(TokenStorageService.ACCESS_TOKEN_KEY, accessToken);
    await store.put(TokenStorageService.REFRESH_TOKEN_KEY, refreshToken);
    await store.flush();
    TokenStorageService.cacheTokens(accessToken, refreshToken);
  }

  static async getAccessToken(): Promise<string> {
    const store = await TokenStorageService.getStore();
    const accessToken = (await store.get(TokenStorageService.ACCESS_TOKEN_KEY, '')) as string;
    if (accessToken.length > 0) {
      AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_ACCESS_TOKEN_KEY, accessToken);
    }
    return accessToken;
  }

  static async getRefreshToken(): Promise<string> {
    const store = await TokenStorageService.getStore();
    const refreshToken = (await store.get(TokenStorageService.REFRESH_TOKEN_KEY, '')) as string;
    if (refreshToken.length > 0) {
      AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_REFRESH_TOKEN_KEY, refreshToken);
    }
    return refreshToken;
  }

  static async getUserInfo(): Promise<UserInfo | undefined> {
    const store = await TokenStorageService.getStore();
    const raw = (await store.get(TokenStorageService.USER_INFO_KEY, '')) as string;
    if (!raw) {
      return undefined;
    }

    try {
      AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_USER_INFO_KEY, raw);
      return JSON.parse(raw) as UserInfo;
    } catch (error) {
      return undefined;
    }
  }

  static getCachedAccessToken(): string {
    return AppStorage.Get<string>(TokenStorageService.CACHED_ACCESS_TOKEN_KEY) ?? '';
  }

  static async hasSession(): Promise<boolean> {
    const accessToken = await TokenStorageService.getAccessToken();
    const refreshToken = await TokenStorageService.getRefreshToken();
    return accessToken.length > 0 && refreshToken.length > 0;
  }

  static async clear(): Promise<void> {
    const store = await TokenStorageService.getStore();
    await store.delete(TokenStorageService.ACCESS_TOKEN_KEY);
    await store.delete(TokenStorageService.REFRESH_TOKEN_KEY);
    await store.delete(TokenStorageService.USER_INFO_KEY);
    await store.flush();
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_ACCESS_TOKEN_KEY, '');
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_REFRESH_TOKEN_KEY, '');
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_USER_INFO_KEY, '');
  }

  private static cacheAuthState(authState: AuthState): void {
    TokenStorageService.cacheTokens(authState.accessToken, authState.refreshToken);
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_USER_INFO_KEY, JSON.stringify(authState.userInfo));
  }

  private static cacheTokens(accessToken: string, refreshToken: string): void {
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_ACCESS_TOKEN_KEY, accessToken);
    AppStorage.SetOrCreate<string>(TokenStorageService.CACHED_REFRESH_TOKEN_KEY, refreshToken);
  }
}
