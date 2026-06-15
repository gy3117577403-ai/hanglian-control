import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { resolveMockUserFromRequestLike } from '../auth/mock-users';
import { AnnouncementDto, AnnouncementStatusDto } from './dto/announcement.dto';
import { DisplaySettingsDto } from './dto/display-settings.dto';
import { RunPilotCheckDto } from './dto/pilot-check.dto';
import { StationProfileDto, UpdateStationProfileStatusDto } from './dto/station-profile.dto';
import { SystemFeedbackDto, SystemFeedbackStatusDto } from './dto/system-feedback.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SettingsService } from './settings.service';

function userFromRequest(request: Request) {
  return resolveMockUserFromRequestLike(request);
}

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('summary')
  @ApiOperation({ summary: '获取 V3.1 系统配置概览，仍为 Mock / 本地 metadata。' })
  summary() { return this.settingsService.summary(); }

  @Get('system')
  @ApiOperation({ summary: '获取系统基础配置。' })
  system() { return this.settingsService.system(); }

  @Patch('system')
  @ApiOperation({ summary: '更新系统基础配置，写入本地 metadata 和审计记录。' })
  updateSystem(@Body() dto: UpdateSystemSettingsDto, @Req() request: Request) {
    return this.settingsService.updateSystem(dto, userFromRequest(request));
  }

  @Get('dictionaries')
  @ApiOperation({ summary: '获取系统字典配置。' })
  dictionaries() { return this.settingsService.dictionaries(); }

  @Patch('dictionaries/:groupKey')
  @ApiOperation({ summary: '更新某组字典，不允许删除系统必需项。' })
  updateDictionary(@Param('groupKey') groupKey: string, @Body() dto: UpdateDictionaryDto, @Req() request: Request) {
    return this.settingsService.updateDictionary(groupKey, dto, userFromRequest(request));
  }

  @Get('station-profiles')
  @ApiOperation({ summary: '获取平板工位配置。' })
  stationProfiles() { return this.settingsService.stationProfiles(); }

  @Post('station-profiles')
  @ApiOperation({ summary: '新增平板工位配置。' })
  createStation(@Body() dto: StationProfileDto, @Req() request: Request) {
    return this.settingsService.createStationProfile(dto, userFromRequest(request));
  }

  @Patch('station-profiles/:id')
  @ApiOperation({ summary: '更新平板工位配置。' })
  updateStation(@Param('id') id: string, @Body() dto: StationProfileDto, @Req() request: Request) {
    return this.settingsService.updateStationProfile(id, dto, userFromRequest(request));
  }

  @Patch('station-profiles/:id/status')
  @ApiOperation({ summary: '启用或停用平板工位配置。' })
  updateStationStatus(@Param('id') id: string, @Body() dto: UpdateStationProfileStatusDto, @Req() request: Request) {
    return this.settingsService.updateStationStatus(id, dto.status, userFromRequest(request));
  }

  @Get('display')
  @ApiOperation({ summary: '获取平板显示配置。' })
  display() { return this.settingsService.display(); }

  @Patch('display')
  @ApiOperation({ summary: '更新平板显示配置。' })
  updateDisplay(@Body() dto: DisplaySettingsDto, @Req() request: Request) {
    return this.settingsService.updateDisplay(dto, userFromRequest(request));
  }

  @Get('announcements')
  @ApiOperation({ summary: '获取试运行公告通知。' })
  announcements(@Query() query: Record<string, string | undefined>) {
    return this.settingsService.announcements(query);
  }

  @Post('announcements')
  @ApiOperation({ summary: '新增试运行公告通知。' })
  createAnnouncement(@Body() dto: AnnouncementDto, @Req() request: Request) {
    return this.settingsService.createAnnouncement(dto, userFromRequest(request));
  }

  @Patch('announcements/:id')
  @ApiOperation({ summary: '更新试运行公告通知。' })
  updateAnnouncement(@Param('id') id: string, @Body() dto: AnnouncementDto, @Req() request: Request) {
    return this.settingsService.updateAnnouncement(id, dto, userFromRequest(request));
  }

  @Patch('announcements/:id/status')
  @ApiOperation({ summary: '启用或关闭试运行公告通知。' })
  updateAnnouncementStatus(@Param('id') id: string, @Body() dto: AnnouncementStatusDto, @Req() request: Request) {
    return this.settingsService.updateAnnouncementStatus(id, dto.active, userFromRequest(request));
  }

  @Get('feedback')
  @ApiOperation({ summary: '获取系统使用反馈。' })
  feedback(@Query() query: Record<string, string | undefined>) {
    return this.settingsService.feedback(query);
  }

  @Post('feedback')
  @ApiOperation({ summary: '提交系统使用反馈。' })
  createFeedback(@Body() dto: SystemFeedbackDto, @Req() request: Request) {
    return this.settingsService.createFeedback(dto, userFromRequest(request));
  }

  @Patch('feedback/:id/status')
  @ApiOperation({ summary: '更新系统使用反馈状态。' })
  updateFeedbackStatus(@Param('id') id: string, @Body() dto: SystemFeedbackStatusDto, @Req() request: Request) {
    return this.settingsService.updateFeedbackStatus(id, dto.status, userFromRequest(request));
  }

  @Get('pilot-check')
  @ApiOperation({ summary: '获取最近一次现场试运行检查结果。' })
  pilotCheck() { return this.settingsService.latestPilotCheck(); }

  @Post('pilot-check/run')
  @ApiOperation({ summary: '运行现场试运行检查，不连接数据库。' })
  runPilotCheck(@Body() _dto: RunPilotCheckDto, @Req() request: Request) {
    return this.settingsService.runPilotCheck(userFromRequest(request));
  }

  @Get('history')
  @ApiOperation({ summary: '获取配置操作历史。' })
  history(@Query() query: Record<string, string | number | undefined>) {
    return this.settingsService.history(query);
  }
}
