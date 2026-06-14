import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.maintenanceService.updateCustomer(id, dto);
  }

  @Get('products')
  products(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.products(query);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.maintenanceService.updateProduct(id, dto);
  }

  @Get('production-plans')
  productionPlans(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.productionPlans(query);
  }

  @Patch('production-plans/:id')
  updateProductionPlan(@Param('id') id: string, @Body() dto: UpdateProductionPlanDto) {
    return this.maintenanceService.updateProductionPlan(id, dto);
  }

  @Get('front-parameters')
  frontParameters(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.frontParameters(query);
  }

  @Patch('front-parameters/:id')
  updateFrontParameter(@Param('id') id: string, @Body() dto: UpdateFrontParameterDto) {
    return this.maintenanceService.updateFrontParameter(id, dto);
  }

  @Get('back-packages')
  backPackages(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.backPackages(query);
  }

  @Patch('back-packages/:id')
  updateBackPackage(@Param('id') id: string, @Body() dto: UpdateBackPackageDto) {
    return this.maintenanceService.updateBackPackage(id, dto);
  }

  @Get('documents')
  documents(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.documents(query);
  }

  @Patch('documents/:id')
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentMaintenanceDto) {
    return this.maintenanceService.updateDocument(id, dto);
  }

  @Post('documents/:id/set-effective')
  setDocumentEffective(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.maintenanceService.setDocumentEffective(id, dto);
  }

  @Post('bulk-status')
  bulkStatus(@Body() dto: BulkStatusUpdateDto) {
    return this.maintenanceService.bulkStatus(dto);
  }

  @Get('review-queue')
  reviewQueue(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.reviewQueue(query);
  }

  @Post('review-queue/:id/resolve')
  resolveReviewItem(@Param('id') id: string, @Body() dto: ReviewRecordDto) {
    return this.maintenanceService.resolveReviewItem(id, dto);
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
