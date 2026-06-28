import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import { CompletePlanDto } from './dto/complete-plan.dto';
import { ExecutionQueryDto } from './dto/execution-query.dto';
import { PausePlanDto } from './dto/pause-plan.dto';
import { ProcessConfirmationDto } from './dto/process-confirmation.dto';
import { QuantityReportDto } from './dto/quantity-report.dto';
import { ResumePlanDto } from './dto/resume-plan.dto';
import { ShiftHandoverDto } from './dto/shift-handover.dto';
import { StartPlanDto } from './dto/start-plan.dto';
import { ExceptionHoldDto } from './dto/status-transition.dto';
import { ExecutionService } from './execution.service';

@ApiTags('execution')
@Controller('execution')
@UseGuards(MockPermissionGuard)
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get('summary')
  @RequirePermissions('execution.view')
  @ApiOperation({ summary: 'V2.5 production execution summary' })
  summary() {
    return this.executionService.summary();
  }

  @Get('plans')
  @RequirePermissions('execution.view')
  @ApiOperation({ summary: 'V2.5 production plans with execution status' })
  plans(@Query() query: ExecutionQueryDto) {
    return this.executionService.plans(query);
  }

  @Get('plans/:planId')
  @RequirePermissions('execution.view')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 production execution detail' })
  detail(@Param('planId') planId: string) {
    return this.executionService.detail(planId);
  }

  @Post('plans/:planId/prepare-start')
  @RequirePermissions('execution.start')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 prepare start check' })
  prepareStart(@Param('planId') planId: string) {
    return this.executionService.prepareStart(planId);
  }

  @Post('plans/:planId/start')
  @RequirePermissions('execution.start')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 start production execution' })
  start(@Param('planId') planId: string, @Body() dto: StartPlanDto) {
    return this.executionService.start(planId, dto);
  }

  @Post('plans/:planId/process-confirm')
  @RequirePermissions('execution.process_confirm')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 process confirmation' })
  processConfirm(@Param('planId') planId: string, @Body() dto: ProcessConfirmationDto) {
    return this.executionService.processConfirm(planId, dto);
  }

  @Post('plans/:planId/quantity-report')
  @RequirePermissions('execution.quantity_report')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 quantity report' })
  quantityReport(@Param('planId') planId: string, @Body() dto: QuantityReportDto) {
    return this.executionService.quantityReport(planId, dto);
  }

  @Post('plans/:planId/pause')
  @RequirePermissions('execution.pause')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 pause production' })
  pause(@Param('planId') planId: string, @Body() dto: PausePlanDto) {
    return this.executionService.pause(planId, dto);
  }

  @Post('plans/:planId/resume')
  @RequirePermissions('execution.resume')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 resume production' })
  resume(@Param('planId') planId: string, @Body() dto: ResumePlanDto) {
    return this.executionService.resume(planId, dto);
  }

  @Post('plans/:planId/exception-hold')
  @RequirePermissions('execution.exception_hold')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 exception hold' })
  exceptionHold(@Param('planId') planId: string, @Body() dto: ExceptionHoldDto) {
    return this.executionService.exceptionHold(planId, dto);
  }

  @Post('plans/:planId/complete')
  @RequirePermissions('execution.complete')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 complete production' })
  complete(@Param('planId') planId: string, @Body() dto: CompletePlanDto) {
    return this.executionService.complete(planId, dto);
  }

  @Get('plans/:planId/timeline')
  @RequirePermissions('execution.view')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: 'V2.5 execution timeline' })
  timeline(@Param('planId') planId: string) {
    return this.executionService.timeline(planId);
  }

  @Post('shift-handover')
  @RequirePermissions('execution.handover')
  @ApiOperation({ summary: 'V2.5 create shift handover record' })
  createHandover(@Body() dto: ShiftHandoverDto) {
    return this.executionService.createHandover(dto);
  }

  @Get('shift-handover')
  @RequirePermissions('execution.view')
  @ApiQuery({ name: 'planId', required: false })
  @ApiOperation({ summary: 'V2.5 shift handover records' })
  handover(@Query('planId') planId?: string) {
    return this.executionService.handover({ planId });
  }

  @Get('daily-report')
  @RequirePermissions('execution.daily_report.view')
  @ApiOperation({ summary: 'V2.5 daily report data' })
  dailyReport(@Query() query: { date?: string; team?: string; processSegment?: string }) {
    return this.executionService.dailyReport(query);
  }

  @Get('daily-report/text')
  @RequirePermissions('execution.daily_report.view')
  @ApiOperation({ summary: 'V2.5 daily report text' })
  dailyReportText(@Query() query: { date?: string; team?: string; processSegment?: string }) {
    return this.executionService.dailyReportText(query);
  }
}
