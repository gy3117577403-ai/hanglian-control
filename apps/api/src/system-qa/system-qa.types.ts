export type SystemQaStatus = 'pass' | 'warning' | 'fail';

export interface SystemQaCheckItem {
  key: string;
  label: string;
  status: SystemQaStatus;
  message: string;
  module?: string;
  detail?: string;
}

export interface SystemQaSummary {
  pass: number;
  warning: number;
  fail: number;
}

export interface SystemQaListReport {
  valid: boolean;
  score: number;
  errors: SystemQaCheckItem[];
  warnings: SystemQaCheckItem[];
  items: SystemQaCheckItem[];
  generatedAt: string;
}

export interface SystemQaContext {
  plans: Array<Record<string, any>>;
  products: Array<Record<string, any>>;
  customers: Array<Record<string, any>>;
  documents: Array<Record<string, any>>;
  fixtures: Array<Record<string, any>>;
  abnormalCases: Array<Record<string, any>>;
  qualityStandards: Array<Record<string, any>>;
  knowledgeRecords: Array<Record<string, any>>;
  executionRecords: Array<Record<string, any>>;
  statusEvents: Array<Record<string, any>>;
  quantityReports: Array<Record<string, any>>;
  handovers: Array<Record<string, any>>;
  importRecords: Array<Record<string, any>>;
  maintenanceRecords: Array<Record<string, any>>;
  auditLogs: Array<Record<string, any>>;
  feedbackRecords: Array<Record<string, any>>;
  generatedAt: string;
}

export interface SystemQaAcceptanceReport {
  version: 'V2.7';
  releaseName: string;
  generatedAt: string;
  overview: {
    dataSource: 'mock';
    databaseConnected: false;
    wecomConnected: false;
    wecomLoginConnected: false;
    realVoiceConnected: false;
  };
  modules: Record<string, 'ok' | 'warning' | 'fail'>;
  checks: {
    dataConsistency: SystemQaListReport;
    businessFlow: SystemQaListReport;
    permissionRegression: {
      valid: boolean;
      score: number;
      roles: Array<Record<string, any>>;
      warnings: SystemQaCheckItem[];
      errors: SystemQaCheckItem[];
      generatedAt: string;
    };
    demoReadiness: SystemQaListReport;
  };
  completedModules: string[];
  notConnected: string[];
  recommendedCommands: string[];
  nextRoutes: string[];
}
