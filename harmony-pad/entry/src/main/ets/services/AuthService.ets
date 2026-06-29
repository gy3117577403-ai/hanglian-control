import { ApiClient } from './ApiClient';
import { TokenStorageService } from './TokenStorageService';
import {
  AuthState,
  LoginRequest,
  LoginResponse,
  MeResponse,
  UserInfo
} from '../models/AuthModels';

export class AuthService {
  static async login(username: string, password: string): Promise<AuthState> {
    const loginRequest: LoginRequest = {
      username,
      password
    };

    const response = await ApiClient.post<LoginResponse>(
      '/auth/login',
      loginRequest,
      {
        skipAuth: true,
        skipRefresh: true
      }
    );

    const authState = AuthService.normalizeLoginResponse(response, username);
    await TokenStorageService.saveAuthState(authState);
    return authState;
  }

  static async fetchMe(): Promise<UserInfo> {
    const response = await ApiClient.get<MeResponse>('/auth/me');
    const data = response.data ?? response;
    return data.userInfo ?? data.user ?? data;
  }

  static async currentUser(): Promise<UserInfo | undefined> {
    return TokenStorageService.getUserInfo();
  }

  static async logout(): Promise<void> {
    try {
      await ApiClient.post<object>(
        '/auth/logout',
        undefined,
        {
          skipRefresh: true
        }
      );
    } finally {
      await TokenStorageService.clear();
    }
  }

  private static normalizeLoginResponse(response: LoginResponse, username: string): AuthState {
    const data = response.data ?? response;
    const accessToken = data.accessToken ?? '';
    const refreshToken = data.refreshToken ?? '';
    const fallbackUserInfo: UserInfo = {
      username: username
    };
    const userInfo = data.userInfo ?? data.user ?? fallbackUserInfo;

    if (!accessToken || !refreshToken) {
      throw new Error('Login response did not include accessToken or refreshToken.');
    }

    return {
      accessToken,
      refreshToken,
      userInfo
    };
  }
}
