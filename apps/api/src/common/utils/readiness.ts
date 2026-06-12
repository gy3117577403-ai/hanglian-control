import type { DocumentStatus, MaterialStatus, RequiredProcess } from '../enums/production.enum';
import type {
  PlanReadiness,
  ProductDocument,
  ProductionPlanMock,
  ReadinessCheckItem,
  VersionAlert,
} from '../types/production.types';

const dangerStatuses: DocumentStatus[] = ['expired', 'missing', 'inconsistent'];

function statusText(status: DocumentStatus) {
  switch (status) {
    case 'effective':
      return '当前有效';
    case 'pending_review':
      return '待确认';
    case 'expired':
      return '已失效';
    case 'missing':
      return '缺失';
    case 'inconsistent':
      return '不一致';
  }
}

function itemFromValue(key: string, label: string, value?: string | number): ReadinessCheckItem {
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0 && value !== 0;
  return {
    key,
    label,
    required: true,
    status: hasValue ? 'pass' : 'fail',
    message: hasValue ? '已配置' : '缺失/异常',
  };
}

function itemFromMaterialStatus(key: string, label: string, status: MaterialStatus): ReadinessCheckItem {
  if (status === '有效') {
    return { key, label, required: true, status: 'pass', message: '当前有效' };
  }
  if (status === '待确认') {
    return { key, label, required: true, status: 'warning', message: '需确认' };
  }
  return { key, label, required: true, status: 'fail', message: '已失效' };
}

function itemFromDocument(doc: ProductDocument | undefined, key: string, label: string): ReadinessCheckItem {
  if (!doc) {
    return { key, label, required: true, status: 'fail', message: '缺失/异常' };
  }
  if (doc.documentStatus === 'effective') {
    return { key, label, required: true, status: 'pass', message: `${doc.version} 当前有效` };
  }
  if (doc.documentStatus === 'pending_review') {
    return { key, label, required: true, status: 'warning', message: `${doc.version} 需确认` };
  }
  return { key, label, required: true, status: 'fail', message: statusText(doc.documentStatus) };
}

function relatedDocument(plan: ProductionPlanMock, documentTypes: ProductDocument['documentType'][]) {
  const candidates = plan.documents.filter((doc) => documentTypes.includes(doc.documentType) && !doc.archived);
  return candidates.find((doc) => doc.source === 'manual_upload' && doc.documentStatus === 'effective')
    ?? candidates.find((doc) => doc.source === 'manual_upload' && doc.documentStatus === 'pending_review')
    ?? candidates.find((doc) => doc.source === 'manual_upload')
    ?? candidates.find((doc) => doc.documentStatus === 'effective')
    ?? candidates.find((doc) => doc.documentStatus === 'pending_review')
    ?? candidates[0];
}

function requiredDocuments(plan: ProductionPlanMock, process: RequiredProcess) {
  return plan.documents.filter((doc) => doc.requiredForProcess === process || doc.requiredForProcess === 'common');
}

function versionAlertsFor(plan: ProductionPlanMock): VersionAlert[] {
  const alerts: VersionAlert[] = [];

  for (const doc of plan.documents) {
    if (dangerStatuses.includes(doc.documentStatus)) {
      alerts.push({
        level: 'danger',
        message: `${doc.title} ${doc.version} ${statusText(doc.documentStatus)}`,
      });
    } else if (doc.documentStatus === 'pending_review') {
      alerts.push({
        level: 'warning',
        message: `${doc.title} ${doc.version} 待确认`,
      });
    }
  }

  if (plan.front.parameterStatus === '待确认') {
    alerts.push({ level: 'warning', message: `前段参数 ${plan.front.drawingVersion} 待确认` });
  }
  if (plan.front.parameterStatus === '失效') {
    alerts.push({ level: 'danger', message: `前段参数 ${plan.front.drawingVersion} 已失效` });
  }
  if (plan.back.materialStatus === '待确认') {
    alerts.push({ level: 'warning', message: `后段资料 ${plan.back.sopVersion} 待确认` });
  }
  if (plan.back.materialStatus === '失效') {
    alerts.push({ level: 'danger', message: `后段资料 ${plan.back.sopVersion} 已失效` });
  }

  return alerts.slice(0, 8);
}

function frontItems(plan: ProductionPlanMock): ReadinessCheckItem[] {
  const docs = requiredDocuments(plan, 'front');
  return [
    itemFromDocument(relatedDocument(plan, ['drawing_pdf']), 'front_drawing_pdf', 'PDF 图纸'),
    itemFromValue('front_cut_length', '裁线长度', plan.front.wireLength),
    itemFromValue('front_strip_length', '剥皮长度', plan.front.strippingLength),
    itemFromValue('front_terminal', '端子型号', plan.front.terminalModel),
    itemFromValue('front_pull_force', '拉力标准', plan.front.pullForceStandard),
    itemFromValue('front_crimp_height', '压接高度', plan.front.crimpHeight),
    itemFromMaterialStatus('front_parameter_status', '前段参数版本', plan.front.parameterStatus),
    ...docs
      .filter((doc) => doc.documentType !== 'drawing_pdf')
      .map((doc) => itemFromDocument(doc, `front_doc_${doc.documentId}`, doc.title)),
  ];
}

function backItems(plan: ProductionPlanMock): ReadinessCheckItem[] {
  const docs = requiredDocuments(plan, 'back');
  return [
    itemFromValue('back_connector', '连接器型号', plan.back.connectorModel),
    itemFromValue('back_manual', '连接器装配说明书', plan.back.assemblyManual),
    itemFromDocument(relatedDocument(plan, ['connector_manual']), 'back_connector_manual', '连接器装配说明书'),
    itemFromValue('back_pin_map_name', '插接孔位图', plan.back.pinMap),
    itemFromDocument(relatedDocument(plan, ['pinout_diagram']), 'back_pin_map', '插接孔位图'),
    itemFromValue('back_sop_name', '作业流程 SOP', plan.back.sop),
    itemFromDocument(relatedDocument(plan, ['sop_image', 'process_card']), 'back_sop', '作业流程 SOP'),
    itemFromValue('back_finished_image_count', '成品细节图', plan.back.finishedImageCount),
    itemFromDocument(relatedDocument(plan, ['finished_detail_image']), 'back_finished_image', '成品细节图'),
    itemFromMaterialStatus('back_material_status', '后段资料版本', plan.back.materialStatus),
    ...docs
      .filter((doc) => !['connector_manual', 'pinout_diagram', 'sop_image', 'finished_detail_image'].includes(doc.documentType))
      .map((doc) => itemFromDocument(doc, `back_doc_${doc.documentId}`, doc.title)),
  ];
}

export function evaluatePlanReadiness(plan: ProductionPlanMock): PlanReadiness {
  const checkItems = plan.segment === '前段'
    ? frontItems(plan)
    : plan.segment === '后段'
      ? backItems(plan)
      : [...frontItems(plan), ...backItems(plan)];

  const versionAlerts = versionAlertsFor(plan);
  const failCount = checkItems.filter((item) => item.status === 'fail').length;
  const warningCount = checkItems.filter((item) => item.status === 'warning').length;
  const score = Math.round(
    (checkItems.reduce((total, item) => {
      if (item.status === 'pass') return total + 1;
      if (item.status === 'warning') return total + 0.7;
      return total;
    }, 0) / Math.max(checkItems.length, 1)) * 100,
  );

  const hasDangerAlert = versionAlerts.some((alert) => alert.level === 'danger');
  const readinessStatus = failCount > 0 || hasDangerAlert
    ? 'blocked'
    : warningCount > 0 || versionAlerts.length > 0
      ? 'need_review'
      : 'ready';

  const summary = readinessStatus === 'ready'
    ? '资料完整，可开工'
    : readinessStatus === 'need_review'
      ? '资料需复核'
      : '资料阻塞，不建议开工';

  return {
    planId: plan.id,
    readinessStatus,
    score,
    summary,
    checkItems,
    versionAlerts,
  };
}
