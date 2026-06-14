import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { TrendQueryDto } from './dto/trend-query.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(MockPermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'V2.6 field analytics overview' })
  overview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.overview(query);
  }

  @Get('production')
  @RequirePermissions('analytics.production.view')
  @ApiOperation({ summary: 'V2.6 production execution analytics' })
  production(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.production(query);
  }

  @Get('quantity')
  @RequirePermissions('analytics.quality.view')
  @ApiOperation({ summary: 'V2.6 quantity and quality analytics' })
  quantity(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.quantity(query);
  }

  @Get('exceptions')
  @RequirePermissions('analytics.quality.view')
  @ApiOperation({ summary: 'V2.6 exception analytics' })
  exceptions(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.exceptions(query);
  }

  @Get('documents')
  @RequirePermissions('analytics.document.view')
  @ApiOperation({ summary: 'V2.6 document issue analytics' })
  documents(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.documents(query);
  }

  @Get('knowledge')
  @RequirePermissions('analytics.knowledge.view')
  @ApiOperation({ summary: 'V2.6 knowledge library analytics' })
  knowledge(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.knowledge(query);
  }

  @Get('trends')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'V2.6 analytics trends' })
  trends(@Query() query: TrendQueryDto) {
    return this.analyticsService.trends(query);
  }

  @Get('rankings')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'V2.6 analytics rankings' })
  rankings(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.rankings(query);
  }

  @Get('summary-text')
  @RequirePermissions('analytics.summary.copy')
  @ApiOperation({ summary: 'V2.6 copyable analytics summary text' })
  summaryText(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.summaryText(query);
  }
}
