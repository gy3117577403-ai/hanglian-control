import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { MockLoginDto } from './dto/mock-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('mock-users')
  @ApiOperation({ summary: '获取本地 Mock 登录用户列表，不连接企业微信。' })
  mockUsers() {
    return this.authService.getMockUsers();
  }

  @Post('mock-login')
  @ApiOperation({ summary: '本地 Mock 登录，返回 mock token、用户和权限。' })
  mockLogin(@Body() dto: MockLoginDto) {
    return this.authService.mockLogin(dto.userId);
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前 Mock 登录用户和权限。' })
  me(@Req() request: Request) {
    return this.authService.me(request);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Mock 退出登录。' })
  logout() {
    return {
      success: true,
      message: '已退出本地 Mock 登录。',
    };
  }

  @Get('permissions')
  @ApiOperation({ summary: '获取本地 Mock 角色权限矩阵。' })
  permissions() {
    return this.authService.permissions();
  }
}
