import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MockPermissionGuard } from '../auth/guards/mock-permission.guard';
import type { MockUser } from '../auth/mock-users';
import { AbnormalQueryDto } from './dto/abnormal-query.dto';
import { FixtureQueryDto } from './dto/fixture-query.dto';
import { KnowledgeLinkQueryDto } from './dto/knowledge-link-query.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { QualityQueryDto } from './dto/quality-query.dto';
import { UpdateAbnormalDto } from './dto/update-abnormal.dto';
import { UpdateFixtureDto } from './dto/update-fixture.dto';
import { UpdateQualityDto } from './dto/update-quality.dto';
import { KnowledgeService } from './knowledge.service';
import type { AbnormalStatus, KnowledgeStatus, QualityStatus } from './knowledge.types';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(MockPermissionGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('fixtures')
  @RequirePermissions('knowledge.fixture.view')
  @ApiOperation({ summary: '查询治具库' })
  fixtures(@Query() query: FixtureQueryDto) {
    return this.knowledgeService.fixtures(query);
  }

  @Post('fixtures')
  @RequirePermissions('knowledge.fixture.create')
  @ApiOperation({ summary: '新增治具资料' })
  createFixture(@Body() dto: UpdateFixtureDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.createFixture(dto, user);
  }

  @Patch('fixtures/:id')
  @RequirePermissions('knowledge.fixture.update')
  @ApiOperation({ summary: '更新治具资料' })
  updateFixture(@Param('id') id: string, @Body() dto: UpdateFixtureDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateFixture(id, dto, user);
  }

  @Patch('fixtures/:id/status')
  @RequirePermissions('knowledge.fixture.update')
  @ApiOperation({ summary: '更新治具状态' })
  updateFixtureStatus(@Param('id') id: string, @Body() dto: { status: KnowledgeStatus; reason?: string }, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateFixtureStatus(id, dto.status, dto.reason, user);
  }

  @Get('abnormal-cases')
  @RequirePermissions('knowledge.abnormal.view')
  @ApiOperation({ summary: '查询异常库' })
  abnormalCases(@Query() query: AbnormalQueryDto) {
    return this.knowledgeService.abnormalCases(query);
  }

  @Post('abnormal-cases')
  @RequirePermissions('knowledge.abnormal.create')
  @ApiOperation({ summary: '新增异常案例' })
  createAbnormalCase(@Body() dto: UpdateAbnormalDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.createAbnormalCase(dto, user);
  }

  @Patch('abnormal-cases/:id')
  @RequirePermissions('knowledge.abnormal.update')
  @ApiOperation({ summary: '更新异常案例' })
  updateAbnormalCase(@Param('id') id: string, @Body() dto: UpdateAbnormalDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateAbnormalCase(id, dto, user);
  }

  @Patch('abnormal-cases/:id/status')
  @RequirePermissions('knowledge.abnormal.update')
  @ApiOperation({ summary: '更新异常案例状态' })
  updateAbnormalStatus(@Param('id') id: string, @Body() dto: { status: AbnormalStatus; reason?: string }, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateAbnormalStatus(id, dto.status, dto.reason, user);
  }

  @Get('quality-standards')
  @RequirePermissions('knowledge.quality.view')
  @ApiOperation({ summary: '查询质量标准库' })
  qualityStandards(@Query() query: QualityQueryDto) {
    return this.knowledgeService.qualityStandards(query);
  }

  @Post('quality-standards')
  @RequirePermissions('knowledge.quality.create')
  @ApiOperation({ summary: '新增质量标准' })
  createQualityStandard(@Body() dto: UpdateQualityDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.createQualityStandard(dto, user);
  }

  @Patch('quality-standards/:id')
  @RequirePermissions('knowledge.quality.update')
  @ApiOperation({ summary: '更新质量标准' })
  updateQualityStandard(@Param('id') id: string, @Body() dto: UpdateQualityDto, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateQualityStandard(id, dto, user);
  }

  @Patch('quality-standards/:id/status')
  @RequirePermissions('knowledge.quality.update')
  @ApiOperation({ summary: '更新质量标准状态' })
  updateQualityStatus(@Param('id') id: string, @Body() dto: { status: QualityStatus; reason?: string }, @CurrentUser() user: MockUser) {
    return this.knowledgeService.updateQualityStatus(id, dto.status, dto.reason, user);
  }

  @Get('product/:productId/summary')
  @RequirePermissions('knowledge.fixture.view')
  @ApiParam({ name: 'productId' })
  @ApiOperation({ summary: '按产品查询现场知识汇总' })
  productSummary(@Param('productId') productId: string, @Query() query: KnowledgeLinkQueryDto) {
    return this.knowledgeService.productSummary(productId, query);
  }

  @Get('plan/:planId/summary')
  @RequirePermissions('knowledge.fixture.view')
  @ApiParam({ name: 'planId' })
  @ApiOperation({ summary: '按生产计划查询现场知识汇总' })
  planSummary(@Param('planId') planId: string, @Query() query: KnowledgeLinkQueryDto) {
    return this.knowledgeService.planSummary(planId, query);
  }

  @Get('search')
  @RequirePermissions('knowledge.fixture.view')
  @ApiOperation({ summary: '搜索治具、异常、质量标准' })
  search(@Query() query: KnowledgeSearchDto) {
    return this.knowledgeService.search(query);
  }

  @Get('history')
  @RequirePermissions('knowledge.history.view')
  @ApiOperation({ summary: '查询知识库维护历史' })
  history(@Query() query: { entityType?: never; entityId?: string; operatorId?: string; keyword?: string; limit?: string }) {
    return this.knowledgeService.history(query);
  }
}

