export interface JwtPayload {
  sub: string;
  username: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}
