import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import { AcceptanceReportDto } from './dto/acceptance-report.dto';
import { ConsistencyQueryDto } from './dto/consistency-query.dto';
import { RegressionQueryDto } from './dto/regression-query.dto';
import { SystemQaService } from './system-qa.service';

@ApiTags('system-qa')
@Controller('system-qa')
@UseGuards(MockPermissionGuard)
export class SystemQaController {
  constructor(private readonly systemQaService: SystemQaService) {}

  @Get('overview')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 full regression overview' })
  overview(@Query() _query: RegressionQueryDto) {
    return this.systemQaService.overview();
  }

  @Get('data-consistency')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 data consistency check' })
  dataConsistency(@Query() _query: ConsistencyQueryDto) {
    return this.systemQaService.dataConsistency();
  }

  @Get('business-flow')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 business flow regression check' })
  businessFlow(@Query() _query: RegressionQueryDto) {
    return this.systemQaService.businessFlow();
  }

  @Get('permission-regression')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 permission regression check' })
  permissionRegression(@Query() _query: RegressionQueryDto) {
    return this.systemQaService.permissionRegression();
  }

  @Get('demo-readiness')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 demo readiness check' })
  demoReadiness(@Query() _query: RegressionQueryDto) {
    return this.systemQaService.demoReadiness();
  }

  @Get('acceptance-report')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 acceptance report JSON' })
  acceptanceReport(@Query() _query: AcceptanceReportDto) {
    return this.systemQaService.acceptanceReport();
  }

  @Get('acceptance-report/text')
  @RequirePermissions('system.diagnostics.view')
  @ApiOperation({ summary: 'V2.7 copyable acceptance report text' })
  acceptanceReportText(@Query() _query: AcceptanceReportDto) {
    return this.systemQaService.acceptanceReportText();
  }
}
