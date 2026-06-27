import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MockPermissionGuard } from './guards/mock-permission.guard';

@Global()
@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, MockPermissionGuard],
  exports: [AuthService, JwtAuthGuard, MockPermissionGuard],
})
export class AuthModule {}
