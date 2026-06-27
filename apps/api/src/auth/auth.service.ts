import { randomUUID } from 'node:crypto';
import {
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UsersService, toPublicUser } from '../users';
import type { PublicUser, UserRecord } from '../users';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { JwtPayload } from './jwt-payload.interface';

export interface AuthTokenResponse {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.usersService.findActiveByUsername(dto.username);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return this.issueTokenPair(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is no longer active.');
    }

    const tokenMatches = await compare(dto.refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token is no longer active.');
    }

    return this.issueTokenPair(user);
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findActiveById(userId);
    if (!user) {
      throw new UnauthorizedException('User is not active.');
    }
    return toPublicUser(user);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const payload = await this.verifyToken(token, this.accessSecret);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }
    return payload;
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const payload = await this.verifyToken(token, this.refreshSecret);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return payload;
  }

  private async verifyToken(
    token: string,
    secret: string,
  ): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private async issueTokenPair(user: UserRecord): Promise<AuthTokenResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          username: user.username,
          type: 'access',
        } satisfies JwtPayload,
        {
          secret: this.accessSecret,
          expiresIn: this.accessTokenExpiresIn as any,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          username: user.username,
          type: 'refresh',
          jti: randomUUID(),
        } satisfies JwtPayload,
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshTokenExpiresIn as any,
        },
      ),
    ]);

    const refreshTokenHash = await hash(refreshToken, this.bcryptRounds);
    const updatedUser = await this.usersService.markLoginSuccess(
      user.id,
      refreshTokenHash,
    );

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessTokenExpiresIn,
      refreshTokenExpiresIn: this.refreshTokenExpiresIn,
      user: toPublicUser(updatedUser),
    };
  }

  private get accessSecret() {
    return this.requiredSecret(
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
        this.configService.get<string>('JWT_SECRET'),
      'JWT_ACCESS_SECRET',
      'hanglian-dev-access-secret-change-me',
    );
  }

  private get refreshSecret() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    return this.requiredSecret(
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
        (jwtSecret ? `${jwtSecret}:refresh` : undefined),
      'JWT_REFRESH_SECRET',
      'hanglian-dev-refresh-secret-change-me',
    );
  }

  private get accessTokenExpiresIn() {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  }

  private get refreshTokenExpiresIn() {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  private get bcryptRounds() {
    const configured = Number(
      this.configService.get<string>('AUTH_BCRYPT_ROUNDS') ?? 12,
    );
    return Number.isFinite(configured) && configured >= 10 ? configured : 12;
  }

  private requiredSecret(
    value: string | undefined,
    envName: string,
    devDefault: string,
  ) {
    const secret = value?.trim();
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        `${envName} is required in production.`,
      );
    }
    return devDefault;
  }
}
