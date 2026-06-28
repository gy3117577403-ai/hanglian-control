import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { MockUser } from '../auth/mock-users';
import { mockStore } from '../mock/production.mock';
import { LocalStorageService } from '../storage/local-storage.service';
import { runPilotCheck } from './helpers/pilot-checker';
import { arrayFromUnknown, booleanFromUnknown, clone, compactText } from './helpers/settings-normalizer';
import { ensureDictionaryRequiredItems, ensureRecordExists } from './helpers/settings-validator';
import {
  defaultAnnouncements,
  defaultDictionaries,
  defaultDisplaySettings,
  defaultStationProfiles,
  defaultSystemFeedback,
  defaultSystemSettings,
  type AnnouncementRecord,
  type DictionaryGroup,
  type DisplaySettings,
  type PilotCheckResult,
  type SettingsRecord,
  type StationProfile,
  type SystemFeedbackRecord,
  type SystemSettings,
} from './mock/settings-seed';
import type { AnnouncementDto } from './dto/announcement.dto';
import type { DisplaySettingsDto } from './dto/display-settings.dto';
import type { StationProfileDto } from './dto/station-profile.dto';
import type { SystemFeedbackDto } from './dto/system-feedback.dto';
import type { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import type { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

const FILES = {
  system: 'system-settings.json',
  dictionaries: 'dictionary-settings.json',
  stations: 'station-profiles.json',
  display: 'display-settings.json',
  announcements: 'announcement-records.json',
  feedback: 'system-feedback-records.json',
  pilotChecks: 'pilot-check-records.json',
  records: 'settings-records.json',
};

const defaultOperator = {
  operatorId: 'demo-settings',
  operatorName: '系统配置演示账号',
  operatorRole: '系统配置',
};

function operatorFromUser(user?: MockUser) {
  return user
    ? {
        operatorId: user.userId,
        operatorName: user.name,
        operatorRole: user.roleLabel,
      }
    : defaultOperator;
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${randomUUID()}`;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly storage: LocalStorageService,
    private readonly audit: AuditService,
  ) {}

  summary() {
    const system = this.system();
    const dictionaries = this.dictionaries();
    const stations = this.stationProfiles();
    const announcements = this.announcements({ active: 'true' });
    const feedback = this.feedback({ status: 'open' });
    const history = this.history({ limit: 1 });
    return {
      version: 'V3.1',
      stage: '现场试运行配置版',
      dataSource: 'mock',
      sealosConnected: false,
      wecomDiskConnected: false,
      realVoiceConnected: false,
      systemName: system.systemName,
      stationProfiles: stations.length,
      dictionaryGroups: dictionaries.length,
      announcements: announcements.length,
      openFeedback: feedback.length,
      lastUpdatedAt: history[0]?.createdAt ?? system.updatedAt,
    };
  }

  system() {
    return this.storage.readMetadataSync<SystemSettings>(FILES.system, clone(defaultSystemSettings));
  }

  updateSystem(dto: UpdateSystemSettingsDto, user?: MockUser) {
    const before = this.system();
    const next: SystemSettings = {
      ...before,
      ...dto,
      systemName: compactText(dto.systemName, before.systemName),
      workshopName: compactText(dto.workshopName, before.workshopName),
      defaultTeam: compactText(dto.defaultTeam, before.defaultTeam),
      defaultRole: compactText(dto.defaultRole, before.defaultRole),
      remark: dto.remark ?? before.remark,
      allowWarningStart: booleanFromUnknown(dto.allowWarningStart, before.allowWarningStart),
      enableFieldMode: booleanFromUnknown(dto.enableFieldMode, before.enableFieldMode),
      enableDemoTools: booleanFromUnknown(dto.enableDemoTools, before.enableDemoTools),
      updatedAt: now(),
    };
    this.storage.writeMetadataSync(FILES.system, next);
    this.record('system_settings', 'system', 'system_settings_updated', before, next, user);
    return next;
  }

  dictionaries() {
    return this.storage.readMetadataArraySync<DictionaryGroup>(FILES.dictionaries, clone(defaultDictionaries));
  }

  updateDictionary(groupKey: string, dto: UpdateDictionaryDto, user?: MockUser) {
    const groups = this.dictionaries();
    const index = groups.findIndex((group) => group.groupKey === groupKey);
    const before = ensureRecordExists(groups[index], `未找到字典组：${groupKey}`);
    const next: DictionaryGroup = {
      ...before,
      items: dto.items.map((item, itemIndex) => ({
        key: item.key,
        label: item.label,
        required: item.required ?? before.items.find((row) => row.key === item.key)?.required ?? false,
        enabled: item.enabled,
        sort: Number.isFinite(item.sort) ? item.sort : itemIndex + 1,
        remark: item.remark,
      })),
      updatedAt: now(),
    };
    ensureDictionaryRequiredItems(before, next);
    groups[index] = next;
    this.storage.writeMetadataArraySync(FILES.dictionaries, groups);
    this.record('dictionary', groupKey, 'dictionary_updated', before, next, user);
    return next;
  }

  stationProfiles() {
    return this.storage.readMetadataArraySync<StationProfile>(FILES.stations, clone(defaultStationProfiles));
  }

  createStationProfile(dto: StationProfileDto, user?: MockUser) {
    const rows = this.stationProfiles();
    const createdAt = now();
    const station: StationProfile = {
      stationId: id('STATION'),
      stationName: compactText(dto.stationName, '新建平板工位'),
      stationCode: compactText(dto.stationCode, `TAB-${rows.length + 1}`),
      processSegment: dto.processSegment ?? 'common',
      defaultRole: compactText(dto.defaultRole, 'front_leader'),
      defaultTeam: compactText(dto.defaultTeam, 'A 班'),
      defaultPlanScope: dto.defaultPlanScope ?? 'today',
      defaultTabs: arrayFromUnknown(dto.defaultTabs, ['plans', 'documents']),
      enabledQuickActions: arrayFromUnknown(dto.enabledQuickActions, ['feedback']),
      showKnowledgePanel: booleanFromUnknown(dto.showKnowledgePanel, true),
      showExecutionPanel: booleanFromUnknown(dto.showExecutionPanel, true),
      showAnalyticsPanel: booleanFromUnknown(dto.showAnalyticsPanel, false),
      fieldModeDefault: booleanFromUnknown(dto.fieldModeDefault, true),
      remark: dto.remark ?? '',
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    };
    rows.unshift(station);
    this.storage.writeMetadataArraySync(FILES.stations, rows);
    this.record('station_profile', station.stationId, 'station_created', undefined, station, user);
    return station;
  }

  updateStationProfile(stationId: string, dto: StationProfileDto, user?: MockUser) {
    const rows = this.stationProfiles();
    const index = rows.findIndex((row) => row.stationId === stationId);
    const before = ensureRecordExists(rows[index], `未找到工位配置：${stationId}`);
    const next: StationProfile = {
      ...before,
      stationName: compactText(dto.stationName, before.stationName),
      stationCode: compactText(dto.stationCode, before.stationCode),
      processSegment: dto.processSegment ?? before.processSegment,
      defaultRole: compactText(dto.defaultRole, before.defaultRole),
      defaultTeam: compactText(dto.defaultTeam, before.defaultTeam),
      defaultPlanScope: dto.defaultPlanScope ?? before.defaultPlanScope,
      defaultTabs: arrayFromUnknown(dto.defaultTabs, before.defaultTabs),
      enabledQuickActions: arrayFromUnknown(dto.enabledQuickActions, before.enabledQuickActions),
      showKnowledgePanel: booleanFromUnknown(dto.showKnowledgePanel, before.showKnowledgePanel),
      showExecutionPanel: booleanFromUnknown(dto.showExecutionPanel, before.showExecutionPanel),
      showAnalyticsPanel: booleanFromUnknown(dto.showAnalyticsPanel, before.showAnalyticsPanel),
      fieldModeDefault: booleanFromUnknown(dto.fieldModeDefault, before.fieldModeDefault),
      remark: dto.remark ?? before.remark,
      updatedAt: now(),
    };
    rows[index] = next;
    this.storage.writeMetadataArraySync(FILES.stations, rows);
    this.record('station_profile', stationId, 'station_updated', before, next, user);
    return next;
  }

  updateStationStatus(stationId: string, status: StationProfile['status'], user?: MockUser) {
    const rows = this.stationProfiles();
    const index = rows.findIndex((row) => row.stationId === stationId);
    const before = ensureRecordExists(rows[index], `未找到工位配置：${stationId}`);
    const next = { ...before, status, updatedAt: now() };
    rows[index] = next;
    this.storage.writeMetadataArraySync(FILES.stations, rows);
    this.record('station_profile', stationId, 'station_status_updated', before, next, user);
    return next;
  }

  display() {
    return this.storage.readMetadataSync<DisplaySettings>(FILES.display, clone(defaultDisplaySettings));
  }

  updateDisplay(dto: DisplaySettingsDto, user?: MockUser) {
    const before = this.display();
    const next: DisplaySettings = { ...before, ...dto, defaultTheme: 'warm_3d', updatedAt: now() };
    this.storage.writeMetadataSync(FILES.display, next);
    this.record('display_settings', 'display', 'display_settings_updated', before, next, user);
    return next;
  }

  announcements(query: Record<string, string | undefined> = {}) {
    const keyword = query.keyword?.trim().toLowerCase();
    return this.storage.readMetadataArraySync<AnnouncementRecord>(FILES.announcements, clone(defaultAnnouncements))
      .filter((row) => query.active === undefined || String(row.active) === query.active)
      .filter((row) => !query.type || row.type === query.type)
      .filter((row) => !keyword || [row.title, row.content, row.type].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }

  createAnnouncement(dto: AnnouncementDto, user?: MockUser) {
    const rows = this.announcements({});
    const createdAt = now();
    const operator = operatorFromUser(user);
    const record: AnnouncementRecord = {
      id: id('ANN'),
      title: compactText(dto.title, '现场试运行通知'),
      content: compactText(dto.content, '请在试运行前确认配置与安全边界。'),
      type: dto.type ?? 'notice',
      severity: dto.severity ?? 'info',
      active: booleanFromUnknown(dto.active, true),
      pinned: booleanFromUnknown(dto.pinned, false),
      startAt: dto.startAt,
      endAt: dto.endAt,
      createdAt,
      updatedAt: createdAt,
      operatorName: operator.operatorName,
    };
    rows.unshift(record);
    this.storage.writeMetadataArraySync(FILES.announcements, rows);
    this.record('announcement', record.id, 'announcement_created', undefined, record, user);
    return record;
  }

  updateAnnouncement(announcementId: string, dto: AnnouncementDto, user?: MockUser) {
    const rows = this.announcements({});
    const index = rows.findIndex((row) => row.id === announcementId);
    const before = ensureRecordExists(rows[index], `未找到公告：${announcementId}`);
    const next: AnnouncementRecord = { ...before, ...dto, title: compactText(dto.title, before.title), content: compactText(dto.content, before.content), updatedAt: now() };
    rows[index] = next;
    this.storage.writeMetadataArraySync(FILES.announcements, rows);
    this.record('announcement', announcementId, 'announcement_updated', before, next, user);
    return next;
  }

  updateAnnouncementStatus(announcementId: string, active: boolean, user?: MockUser) {
    return this.updateAnnouncement(announcementId, { active }, user);
  }

  feedback(query: Record<string, string | undefined> = {}) {
    const keyword = query.keyword?.trim().toLowerCase();
    return this.storage.readMetadataArraySync<SystemFeedbackRecord>(FILES.feedback, clone(defaultSystemFeedback))
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => !query.type || row.feedbackType === query.type)
      .filter((row) => !query.role || row.role === query.role)
      .filter((row) => !keyword || [row.title, row.description, row.userName, row.currentPage].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createFeedback(dto: SystemFeedbackDto, user?: MockUser) {
    const rows = this.feedback({});
    const operator = operatorFromUser(user);
    const createdAt = now();
    const record: SystemFeedbackRecord = {
      id: id('SFB'),
      feedbackType: dto.feedbackType,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      currentPage: dto.currentPage,
      role: dto.role ?? user?.role,
      userId: dto.userId ?? operator.operatorId,
      userName: dto.userName ?? operator.operatorName,
      screenshotRemark: dto.screenshotRemark,
      expectedResult: dto.expectedResult,
      actualResult: dto.actualResult,
      status: 'open',
      createdAt,
      updatedAt: createdAt,
    };
    rows.unshift(record);
    this.storage.writeMetadataArraySync(FILES.feedback, rows);
    this.record('system_feedback', record.id, 'feedback_created', undefined, record, user);
    return record;
  }

  updateFeedbackStatus(feedbackId: string, status: SystemFeedbackRecord['status'], user?: MockUser) {
    const rows = this.feedback({});
    const index = rows.findIndex((row) => row.id === feedbackId);
    const before = ensureRecordExists(rows[index], `未找到使用反馈：${feedbackId}`);
    const operator = operatorFromUser(user);
    const next: SystemFeedbackRecord = {
      ...before,
      status,
      resolverName: ['resolved', 'ignored'].includes(status) ? operator.operatorName : before.resolverName,
      resolvedAt: ['resolved', 'ignored'].includes(status) ? now() : before.resolvedAt,
      updatedAt: now(),
    };
    rows[index] = next;
    this.storage.writeMetadataArraySync(FILES.feedback, rows);
    this.record('system_feedback', feedbackId, 'feedback_status_updated', before, next, user);
    return next;
  }

  latestPilotCheck() {
    const rows = this.storage.readMetadataArraySync<PilotCheckResult>(FILES.pilotChecks, []);
    return rows[0] ?? runPilotCheck('系统初始化');
  }

  runPilotCheck(user?: MockUser) {
    const operator = operatorFromUser(user);
    const result = runPilotCheck(operator.operatorName);
    const rows = this.storage.readMetadataArraySync<PilotCheckResult>(FILES.pilotChecks, []);
    rows.unshift(result);
    this.storage.writeMetadataArraySync(FILES.pilotChecks, rows.slice(0, 50));
    this.record('pilot_check', result.id, 'pilot_check_run', undefined, result, user);
    return result;
  }

  history(query: Record<string, string | number | undefined> = {}) {
    const limit = Math.min(Math.max(Number(query.limit ?? 80), 1), 200);
    return this.storage.readMetadataArraySync<SettingsRecord>(FILES.records, [])
      .filter((row) => !query.entityType || row.entityType === query.entityType)
      .slice(0, limit);
  }

  private record(entityType: string, entityId: string, action: string, before: unknown, after: unknown, user?: MockUser) {
    const operator = operatorFromUser(user);
    const record: SettingsRecord = {
      id: id('SET'),
      entityType,
      entityId,
      action,
      before,
      after,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: operator.operatorRole,
      createdAt: now(),
    };
    const rows = this.storage.readMetadataArraySync<SettingsRecord>(FILES.records, []);
    rows.unshift(record);
    this.storage.writeMetadataArraySync(FILES.records, rows.slice(0, 1000));
    void this.audit.tryCreate({
      entityType: 'system',
      entityId,
      action: 'maintenance_recorded',
      before,
      after,
      message: `V3.1 配置变更：${action}`,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: operator.operatorRole,
    });
    return record;
  }
}
