import { Injectable } from '@nestjs/common';
import { mockStore } from '../../mock/production.mock';
import type { ProductDocument, ProductionPlanMock, SearchResult } from '../../common/types/production.types';
import type { SearchResultType, SearchScope } from '../../common/enums/production.enum';
import type { SearchRepositoryInterface } from '../interfaces/search.repository.interface';
import { MockDocumentRepository } from './mock-document.repository';

interface SearchCandidate {
  type: SearchResultType;
  matchedField: string;
  title: string;
  value: string;
  document?: ProductDocument;
}

function statusKeyword(status: ProductDocument['documentStatus']) {
  switch (status) {
    case 'effective':
      return '当前有效 有效';
    case 'pending_review':
      return '待确认 需复核';
    case 'expired':
      return '已失效 历史版本';
    case 'missing':
      return '缺失';
    case 'inconsistent':
      return '不一致';
  }
}

function candidatesFor(plan: ProductionPlanMock, documentRepository: MockDocumentRepository): SearchCandidate[] {
  const rows: SearchCandidate[] = [
    { type: 'plan', matchedField: '销售', title: plan.sales, value: plan.sales },
    { type: 'plan', matchedField: '客户', title: plan.customer, value: plan.customer },
    { type: 'plan', matchedField: '产品编号', title: plan.productCode, value: plan.productCode },
    { type: 'plan', matchedField: '产品名称', title: plan.productName, value: plan.productName },
    { type: 'plan', matchedField: '产品版本', title: plan.productVersion, value: plan.productVersion },
    { type: 'front-parameter', matchedField: '裁线长度', title: plan.front.wireLength, value: plan.front.wireLength },
    { type: 'front-parameter', matchedField: '剥皮长度', title: plan.front.strippingLength, value: plan.front.strippingLength },
    { type: 'front-parameter', matchedField: '端子型号', title: plan.front.terminalModel, value: plan.front.terminalModel },
    { type: 'front-parameter', matchedField: '拉力标准', title: plan.front.pullForceStandard, value: plan.front.pullForceStandard },
    { type: 'front-parameter', matchedField: '压接高度', title: plan.front.crimpHeight, value: plan.front.crimpHeight },
    { type: 'connector', matchedField: '连接器型号', title: plan.back.connectorModel, value: plan.back.connectorModel },
    { type: 'back-document', matchedField: '连接器装配说明书', title: plan.back.assemblyManual, value: plan.back.assemblyManual },
    { type: 'back-document', matchedField: '插接孔位图', title: plan.back.pinMap, value: plan.back.pinMap },
    { type: 'sop', matchedField: '作业流程 SOP', title: plan.back.sop, value: plan.back.sop },
    { type: 'detail-image', matchedField: '成品细节图', title: `${plan.back.finishedImageCount} 张成品细节图`, value: `${plan.back.finishedImageCount} 张成品细节图` },
  ];

  for (const doc of documentRepository.findDocumentsByPlan(plan.id)) {
    const type: SearchResultType = doc.documentType === 'drawing_pdf'
      ? 'drawing'
      : doc.documentType === 'sop_image' || doc.documentType === 'process_card'
        ? 'sop'
        : doc.documentType === 'connector_manual' || doc.documentType === 'pinout_diagram'
          ? 'back-document'
          : 'detail-image';

    rows.push({
      type,
      matchedField: '文件资料',
      title: doc.title,
      value: [
        doc.title,
        doc.version,
        doc.keywords.join(' '),
        doc.mockPreviewText,
        doc.originalFileName,
        doc.remark,
        statusKeyword(doc.documentStatus),
        doc.source,
        doc.versionGroupKey,
      ].filter(Boolean).join(' '),
      document: doc,
    });
  }

  return rows;
}

@Injectable()
export class MockSearchRepository implements SearchRepositoryInterface {
  constructor(private readonly documentRepository: MockDocumentRepository) {}

  search(keyword = '', planId?: string): SearchResult[] {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return [];

    const currentPlan = planId ? mockStore.findPlanById(planId) : undefined;
    const orderedPlans = [
      ...(currentPlan ? [currentPlan] : []),
      ...mockStore.productionPlans.filter((plan) => plan.id !== planId),
    ];

    const results: SearchResult[] = [];

    for (const plan of orderedPlans) {
      const scope: SearchScope = plan.id === planId ? 'current_plan' : 'global';
      for (const candidate of candidatesFor(plan, this.documentRepository)) {
        if (!candidate.value.toLowerCase().includes(normalizedKeyword)) continue;
        const document = candidate.document;
        results.push({
          id: `SR-${plan.id}-${candidate.type}-${results.length}`,
          planId: plan.id,
          type: candidate.type,
          scope,
          title: candidate.title,
          subtitle: `${plan.customer} / ${plan.productCode} / ${plan.productName}`,
          matchedField: candidate.matchedField,
          snippet: candidate.value,
          version: document?.version,
          status: document?.documentStatus,
          source: document?.source,
          isEffective: document?.documentStatus === 'effective',
          isHistorical: Boolean(document && document.documentStatus !== 'effective'),
          versionGroupKey: document?.versionGroupKey,
        });
      }
    }

    return results
      .sort((a, b) => (a.scope === b.scope ? 0 : a.scope === 'current_plan' ? -1 : 1))
      .slice(0, planId ? 24 : 20);
  }
}
