import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import type { MockUser } from '../auth/mock-users';
import { BulkStatusUpdateDto } from './dto/bulk-status-update.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { ReviewRecordDto } from './dto/review-record.dto';
import { UpdateBackPackageDto } from './dto/update-back-package.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateDocumentMaintenanceDto } from './dto/update-document-maintenance.dto';
import { UpdateFrontParameterDto } from './dto/update-front-parameter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductionPlanDto } from './dto/update-production-plan.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('summary')
  @ApiOperation({ summary: '资料维护中心概览' })
  summary() {
    return this.maintenanceService.summary();
  }

  @Get('customers')
  customers(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.customers(query);
  }

  @Patch('customers/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.customer.update')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateCustomer(id, dto, user);
  }

  @Get('products')
  products(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.products(query);
  }

  @Patch('products/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.product.update')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateProduct(id, dto, user);
  }

  @Get('production-plans')
  productionPlans(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.productionPlans(query);
  }

  @Patch('production-plans/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.plan.update')
  updateProductionPlan(@Param('id') id: string, @Body() dto: UpdateProductionPlanDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateProductionPlan(id, dto, user);
  }

  @Get('front-parameters')
  frontParameters(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.frontParameters(query);
  }

  @Patch('front-parameters/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.parameter.update')
  updateFrontParameter(@Param('id') id: string, @Body() dto: UpdateFrontParameterDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateFrontParameter(id, dto, user);
  }

  @Get('back-packages')
  backPackages(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.backPackages(query);
  }

  @Patch('back-packages/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.package.update')
  updateBackPackage(@Param('id') id: string, @Body() dto: UpdateBackPackageDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateBackPackage(id, dto, user);
  }

  @Get('documents')
  documents(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.documents(query);
  }

  @Patch('documents/:id')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.document.update')
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentMaintenanceDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.updateDocument(id, dto, user);
  }

  @Post('documents/:id/set-effective')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('document.set_effective')
  setDocumentEffective(@Param('id') id: string, @Body() dto: { reason?: string }, @CurrentUser() user: MockUser) {
    return this.maintenanceService.setDocumentEffective(id, dto, user);
  }

  @Post('bulk-status')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.document.update')
  bulkStatus(@Body() dto: BulkStatusUpdateDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.bulkStatus(dto, user);
  }

  @Get('review-queue')
  reviewQueue(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.reviewQueue(query);
  }

  @Post('review-queue/:id/resolve')
  @UseGuards(MockPermissionGuard)
  @RequirePermissions('maintenance.review.resolve')
  resolveReviewItem(@Param('id') id: string, @Body() dto: ReviewRecordDto, @CurrentUser() user: MockUser) {
    return this.maintenanceService.resolveReviewItem(id, dto, user);
  }

  @Get('history')
  history(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.history(query);
  }

  @Get('history/:id')
  historyDetail(@Param('id') id: string) {
    return this.maintenanceService.historyDetail(id);
  }
}
