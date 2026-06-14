import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MockPermissionGuard } from './guards/mock-permission.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, MockPermissionGuard],
  exports: [AuthService, MockPermissionGuard],
})
export class AuthModule {}
