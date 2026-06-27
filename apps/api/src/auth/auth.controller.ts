import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { MockLoginDto } from './dto/mock-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with username and password.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access and refresh tokens.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout the current JWT user.' })
  logout(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current JWT user.' })
  me(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.me(user.id);
  }

  @Get('mock-users')
  @ApiOperation({ summary: 'List local mock login users for development.' })
  mockUsers() {
    return this.authService.getMockUsers();
  }

  @Post('mock-login')
  @ApiOperation({ summary: 'Local mock login for development.' })
  mockLogin(@Body() dto: MockLoginDto) {
    return this.authService.mockLogin(dto.userId);
  }

  @Get('mock-me')
  @ApiOperation({ summary: 'Get the current local mock user for development.' })
  mockMe(@Req() request: Request) {
    return this.authService.mockMe(request);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List local mock permission matrix.' })
  permissions() {
    return this.authService.permissions();
  }
}
