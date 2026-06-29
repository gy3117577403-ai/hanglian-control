export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  id?: string;
  username?: string;
  name?: string;
  displayName?: string;
  phone?: string;
  roles?: string[];
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  userInfo: UserInfo;
}

export interface AuthResponseData {
  accessToken?: string;
  refreshToken?: string;
  userInfo?: UserInfo;
  user?: UserInfo;
}

export interface LoginResponse extends AuthResponseData {
  data?: AuthResponseData;
}

export interface RefreshResponseData {
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  data?: RefreshResponseData;
}

export interface MeResponseData extends UserInfo {
  userInfo?: UserInfo;
  user?: UserInfo;
}

export interface MeResponse extends MeResponseData {
  data?: MeResponseData;
}
