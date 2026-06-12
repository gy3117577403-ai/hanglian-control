import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ProductionPlanMock, SearchResult } from '../../common/types/production.types';
import type { SearchRepositoryInterface } from '../interfaces/search.repository.interface';
import { mapPrismaPlan } from './prisma-mappers';

const PLAN_INCLUDE = {
  product: {
    include: {
      customer: true,
      frontParameters: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      backPackages: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
    },
  },
  documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
};

function includes(value: unknown, keyword: string) {
  return String(value ?? '').toLowerCase().includes(keyword);
}

function pushIfMatched(
  rows: SearchResult[],
  plan: ProductionPlanMock,
  keyword: string,
  type: SearchResult['type'],
  text: string,
  matchedField: string,
  version?: string,
) {
  if (!includes(text, keyword)) return;
  rows.push({
    id: `PRISMA-${plan.id}-${type}-${rows.length}`,
    planId: plan.id,
    type,
    scope: 'global',
    title: type === 'plan' ? `${plan.productCode} ${plan.productName}` : text,
    subtitle: `${plan.customer} / ${plan.productCode}`,
    matchedField,
    snippet: text,
    version,
  });
}

@Injectable()
export class PrismaSearchRepository implements SearchRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword: string, planId?: string): Promise<SearchResult[]> {
    const value = keyword.trim().toLowerCase();
    if (!value) return [];

    const rows = await this.prisma.client.productionPlan.findMany({
      where: {
        deletedAt: null,
        ...(planId ? { id: planId } : {}),
      },
      take: 80,
      orderBy: [{ planDate: 'desc' }, { planCode: 'asc' }],
      include: PLAN_INCLUDE,
    });
    const plans = rows.map(mapPrismaPlan);
    const results: SearchResult[] = [];

    for (const plan of plans) {
      pushIfMatched(results, plan, value, 'plan', `${plan.customer} ${plan.productCode} ${plan.productName}`, '计划/客户/产品');
      pushIfMatched(results, plan, value, 'front-parameter', plan.front.wireLength, '裁线长度');
      pushIfMatched(results, plan, value, 'front-parameter', plan.front.strippingLength, '剥皮长度');
      pushIfMatched(results, plan, value, 'front-parameter', plan.front.terminalModel, '端子型号');
      pushIfMatched(results, plan, value, 'front-parameter', plan.front.pullForceStandard, '拉力标准');
      pushIfMatched(results, plan, value, 'front-parameter', plan.front.crimpHeight, '压接高度');
      pushIfMatched(results, plan, value, 'connector', plan.back.connectorModel, '连接器型号');
      pushIfMatched(results, plan, value, 'back-document', plan.back.assemblyManual, '连接器装配说明书');
      pushIfMatched(results, plan, value, 'back-document', plan.back.pinMap, '插接孔位图');
      pushIfMatched(results, plan, value, 'sop', plan.back.sop, '作业流程 SOP', plan.back.sopVersion);
      pushIfMatched(results, plan, value, 'detail-image', `${plan.back.finishedImageCount} 张成品细节图`, '成品细节图');

      for (const document of plan.documents) {
        const text = `${document.title} ${document.description} ${(document.keywords ?? []).join(' ')}`;
        if (!includes(text, value)) continue;
        results.push({
          id: `PRISMA-${document.documentId ?? document.id}`,
          planId: plan.id,
          type: document.documentType === 'drawing_pdf'
            ? 'drawing'
            : document.documentType === 'sop_image' || document.documentType === 'process_card'
              ? 'sop'
              : document.documentType === 'finished_detail_image'
                ? 'detail-image'
                : 'back-document',
          scope: planId ? 'current_plan' : 'global',
          title: document.title,
          subtitle: `${plan.customer} / ${plan.productCode}`,
          matchedField: '文件资料',
          snippet: document.description,
          version: document.version,
          status: document.documentStatus,
          source: document.source,
          isEffective: document.documentStatus === 'effective',
          isHistorical: document.documentStatus === 'expired',
          versionGroupKey: document.versionGroupKey,
        });
      }
    }

    return results.slice(0, 30);
  }
}
