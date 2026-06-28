export type SettingsPermission =
  | 'settings.view'
  | 'settings.update'
  | 'settings.dictionary.view'
  | 'settings.dictionary.update'
  | 'settings.station.view'
  | 'settings.station.update'
  | 'settings.display.view'
  | 'settings.display.update'
  | 'settings.announcement.view'
  | 'settings.announcement.update'
  | 'settings.feedback.create'
  | 'settings.feedback.view'
  | 'settings.feedback.resolve'
  | 'settings.pilot_check.view'
  | 'settings.pilot_check.run';

export type StationStatus = 'active' | 'inactive';
export type ProcessSegmentKey = 'front' | 'back' | 'common';
export type PlanScopeKey = 'today' | 'week';
export type FeedbackStatus = 'open' | 'processing' | 'resolved' | 'ignored';
export type PilotCheckStatus = 'pass' | 'warning' | 'fail';

export interface SystemSettings {
  systemName: string;
  workshopName: string;
  defaultTeam: string;
  defaultRole: string;
  defaultPlanScope: PlanScopeKey;
  allowWarningStart: boolean;
  enableFieldMode: boolean;
  enableDemoTools: boolean;
  remark: string;
  updatedAt: string;
}

export interface DictionaryItem {
  key: string;
  label: string;
  required?: boolean;
  enabled: boolean;
  sort: number;
  remark?: string;
}

export interface DictionaryGroup {
  groupKey: string;
  groupName: string;
  description: string;
  items: DictionaryItem[];
  updatedAt: string;
}

export interface StationProfile {
  stationId: string;
  stationName: string;
  stationCode: string;
  processSegment: ProcessSegmentKey;
  defaultRole: string;
  defaultTeam: string;
  defaultPlanScope: PlanScopeKey;
  defaultTabs: string[];
  enabledQuickActions: string[];
  showKnowledgePanel: boolean;
  showExecutionPanel: boolean;
  showAnalyticsPanel: boolean;
  fieldModeDefault: boolean;
  remark: string;
  status: StationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DisplaySettings {
  fontScale: 'normal' | 'large' | 'extra_large';
  cardDensity: 'normal' | 'comfortable';
  defaultFieldMode: boolean;
  showDemoBadges: boolean;
  showTechnicalWarnings: boolean;
  enableWarmAnimations: boolean;
  defaultTheme: 'warm_3d';
  updatedAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  type: 'notice' | 'document_change' | 'pilot_reminder' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  pinned: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  operatorName: string;
}

export interface SystemFeedbackRecord {
  id: string;
  feedbackType: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentPage?: string;
  role?: string;
  userId?: string;
  userName?: string;
  screenshotRemark?: string;
  expectedResult?: string;
  actualResult?: string;
  status: FeedbackStatus;
  resolverName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PilotCheckItem {
  key: string;
  label: string;
  status: PilotCheckStatus;
  message: string;
  recommendedAction: string;
}

export interface PilotCheckResult {
  id: string;
  score: number;
  status: PilotCheckStatus;
  checkedAt: string;
  summary: string;
  items: PilotCheckItem[];
  operatorName: string;
}

export interface SettingsRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  reason?: string;
  createdAt: string;
}

const now = '2026-06-15T00:00:00.000Z';

export const defaultSystemSettings: SystemSettings = {
  systemName: '线束车间生产计划资料管控系统',
  workshopName: '线束生产车间',
  defaultTeam: 'A 班',
  defaultRole: '前段组长',
  defaultPlanScope: 'today',
  allowWarningStart: false,
  enableFieldMode: true,
  enableDemoTools: true,
  remark: 'V3.1 现场试运行配置版，仍使用 Mock / 本地 metadata。',
  updatedAt: now,
};

export const defaultDisplaySettings: DisplaySettings = {
  fontScale: 'large',
  cardDensity: 'comfortable',
  defaultFieldMode: true,
  showDemoBadges: true,
  showTechnicalWarnings: true,
  enableWarmAnimations: true,
  defaultTheme: 'warm_3d',
  updatedAt: now,
};

export const defaultDictionaries: DictionaryGroup[] = [
  { groupKey: 'processSegment', groupName: '工序段', description: '前段 / 后段 / 通用', items: [
    { key: 'front', label: '前段', required: true, enabled: true, sort: 1 },
    { key: 'back', label: '后段', required: true, enabled: true, sort: 2 },
    { key: 'common', label: '通用', required: true, enabled: true, sort: 3 },
  ], updatedAt: now },
  { groupKey: 'planStatus', groupName: '计划状态', description: '生产计划状态', items: [
    { key: 'pending', label: '待生产', required: true, enabled: true, sort: 1 },
    { key: 'in_progress', label: '生产中', required: true, enabled: true, sort: 2 },
    { key: 'completed', label: '已完成', required: true, enabled: true, sort: 3 },
    { key: 'exception', label: '异常', required: true, enabled: true, sort: 4 },
  ], updatedAt: now },
  { groupKey: 'documentStatus', groupName: '资料状态', description: '资料版本状态', items: [
    { key: 'effective', label: '当前有效', required: true, enabled: true, sort: 1 },
    { key: 'pending_review', label: '待确认', required: true, enabled: true, sort: 2 },
    { key: 'expired', label: '已失效', required: true, enabled: true, sort: 3 },
    { key: 'inconsistent', label: '不一致', required: true, enabled: true, sort: 4 },
  ], updatedAt: now },
  { groupKey: 'documentType', groupName: '资料类型', description: '图纸、SOP、孔位图、成品图', items: [
    { key: 'drawing_pdf', label: 'PDF 图纸', required: true, enabled: true, sort: 1 },
    { key: 'sop_image', label: 'SOP 图片', required: true, enabled: true, sort: 2 },
    { key: 'pinout_diagram', label: '孔位图', required: true, enabled: true, sort: 3 },
    { key: 'finished_detail_image', label: '成品细节图', required: true, enabled: true, sort: 4 },
  ], updatedAt: now },
  { groupKey: 'fixtureStatus', groupName: '治具状态', description: '现场治具可用状态', items: [
    { key: 'effective', label: '有效', required: true, enabled: true, sort: 1 },
    { key: 'pending_review', label: '待复核', required: true, enabled: true, sort: 2 },
    { key: 'disabled', label: '停用', required: true, enabled: true, sort: 3 },
    { key: 'exception', label: '异常', required: true, enabled: true, sort: 4 },
  ], updatedAt: now },
  { groupKey: 'abnormalSeverity', groupName: '异常严重度', description: '现场异常分级', items: [
    { key: 'low', label: '低', required: true, enabled: true, sort: 1 },
    { key: 'medium', label: '中', required: true, enabled: true, sort: 2 },
    { key: 'high', label: '高', required: true, enabled: true, sort: 3 },
    { key: 'critical', label: '关键', required: true, enabled: true, sort: 4 },
  ], updatedAt: now },
  { groupKey: 'qualityDefectLevel', groupName: '质量缺陷等级', description: '质量标准缺陷等级', items: [
    { key: 'minor', label: '轻微', required: true, enabled: true, sort: 1 },
    { key: 'major', label: '主要', required: true, enabled: true, sort: 2 },
    { key: 'critical', label: '严重', required: true, enabled: true, sort: 3 },
  ], updatedAt: now },
  { groupKey: 'executionStatus', groupName: '执行状态', description: '生产执行闭环状态', items: [
    { key: 'not_started', label: '未开工', required: true, enabled: true, sort: 1 },
    { key: 'running', label: '生产中', required: true, enabled: true, sort: 2 },
    { key: 'paused', label: '暂停', required: true, enabled: true, sort: 3 },
    { key: 'exception_hold', label: '异常停线', required: true, enabled: true, sort: 4 },
    { key: 'completed', label: '已完工', required: true, enabled: true, sort: 5 },
  ], updatedAt: now },
  { groupKey: 'feedbackType', groupName: '使用反馈类型', description: '软件试运行反馈分类', items: [
    { key: 'document_issue', label: '资料问题', required: true, enabled: true, sort: 1 },
    { key: 'preview_issue', label: '预览问题', required: true, enabled: true, sort: 2 },
    { key: 'permission_issue', label: '权限问题', required: true, enabled: true, sort: 3 },
    { key: 'network_issue', label: '网络问题', required: true, enabled: true, sort: 4 },
    { key: 'ui_issue', label: 'UI 问题', required: true, enabled: true, sort: 5 },
    { key: 'performance_issue', label: '性能问题', required: true, enabled: true, sort: 6 },
    { key: 'other', label: '其他', required: true, enabled: true, sort: 7 },
  ], updatedAt: now },
  { groupKey: 'knowledgeCategory', groupName: '知识库分类', description: '治具、异常、质量标准', items: [
    { key: 'fixture', label: '治具', required: true, enabled: true, sort: 1 },
    { key: 'abnormal', label: '异常', required: true, enabled: true, sort: 2 },
    { key: 'quality', label: '质量标准', required: true, enabled: true, sort: 3 },
  ], updatedAt: now },
];

export const defaultStationProfiles: StationProfile[] = [
  {
    stationId: 'station-front-leader',
    stationName: '前段组长平板',
    stationCode: 'FRONT-LEADER-TAB',
    processSegment: 'front',
    defaultRole: 'front_leader',
    defaultTeam: 'A 班',
    defaultPlanScope: 'today',
    defaultTabs: ['front', 'readiness', 'documents'],
    enabledQuickActions: ['upload', 'feedback', 'knowledge'],
    showKnowledgePanel: true,
    showExecutionPanel: true,
    showAnalyticsPanel: false,
    fieldModeDefault: true,
    remark: '默认显示前段参数和开工检查。',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    stationId: 'station-back-leader',
    stationName: '后段组长平板',
    stationCode: 'BACK-LEADER-TAB',
    processSegment: 'back',
    defaultRole: 'back_leader',
    defaultTeam: 'A 班',
    defaultPlanScope: 'today',
    defaultTabs: ['back', 'knowledge', 'documents'],
    enabledQuickActions: ['feedback', 'knowledge', 'execution'],
    showKnowledgePanel: true,
    showExecutionPanel: true,
    showAnalyticsPanel: false,
    fieldModeDefault: true,
    remark: '默认显示后段资料、孔位图和现场知识。',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    stationId: 'station-maintenance',
    stationName: '资料维护平板',
    stationCode: 'MAINT-TAB',
    processSegment: 'common',
    defaultRole: 'maintainer',
    defaultTeam: '工艺资料组',
    defaultPlanScope: 'week',
    defaultTabs: ['imports', 'maintenance', 'documents'],
    enabledQuickActions: ['import', 'maintenance', 'upload'],
    showKnowledgePanel: true,
    showExecutionPanel: false,
    showAnalyticsPanel: true,
    fieldModeDefault: false,
    remark: '默认显示导入中心和资料维护中心。',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    stationId: 'station-demo',
    stationName: '现场演示平板',
    stationCode: 'DEMO-TAB',
    processSegment: 'common',
    defaultRole: 'admin',
    defaultTeam: '系统演示',
    defaultPlanScope: 'week',
    defaultTabs: ['all'],
    enabledQuickActions: ['all'],
    showKnowledgePanel: true,
    showExecutionPanel: true,
    showAnalyticsPanel: true,
    fieldModeDefault: true,
    remark: '显示全部演示工具，适合现场试运行培训。',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
];

export const defaultAnnouncements: AnnouncementRecord[] = [
  {
    id: 'ANN-V31-001',
    title: 'V3.1 现场试运行配置版已启用',
    content: '当前系统仍为 Mock / 本地 metadata 演示，不连接 Sealos，不接企业微信微盘，不接真实语音。',
    type: 'pilot_reminder',
    severity: 'warning',
    active: true,
    pinned: true,
    createdAt: now,
    updatedAt: now,
    operatorName: '系统初始化',
  },
  {
    id: 'ANN-V31-002',
    title: '请使用“使用反馈”记录软件问题',
    content: '生产异常仍走原异常反馈；软件界面、权限、网络、预览等问题请走系统使用反馈。',
    type: 'notice',
    severity: 'info',
    active: true,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    operatorName: '系统初始化',
  },
];

export const defaultSystemFeedback: SystemFeedbackRecord[] = [
  {
    id: 'SFB-V31-001',
    feedbackType: 'ui_issue',
    title: '现场试运行反馈样例',
    description: '用于演示使用反馈闭环，不代表真实现场问题。',
    severity: 'medium',
    currentPage: '/tablet',
    role: 'admin',
    userId: 'mock-admin',
    userName: '管理员演示',
    expectedResult: '能够清楚记录软件问题并跟踪处理状态。',
    actualResult: '当前为 Mock 示例记录。',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  },
];
