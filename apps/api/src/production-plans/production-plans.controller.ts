import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfirmProductionPlanDto } from './dto/confirm-production-plan.dto';
import { ProductionPlansService } from './production-plans.service';

@ApiTags('production-plans')
@Controller('production-plans')
export class ProductionPlansController {
  constructor(private readonly productionPlansService: ProductionPlansService) {}

  @Get()
  @ApiQuery({ name: 'scope', required: false, enum: ['today', 'week'] })
  findAll(@Query('scope') scope: 'today' | 'week' = 'today') {
    return this.productionPlansService.findAll(scope);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取生产计划详情，包含产品资料包和资料完整性检查结果' })
  findOne(@Param('id') id: string) {
    return this.productionPlansService.findOne(id);
  }

  @Get(':id/readiness')
  @ApiOperation({ summary: '获取开工资料完整性检查结果' })
  readiness(@Param('id') id: string) {
    return this.productionPlansService.readiness(id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '模拟组长确认生产计划' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmProductionPlanDto) {
    return this.productionPlansService.confirm(id, dto);
  }
}
