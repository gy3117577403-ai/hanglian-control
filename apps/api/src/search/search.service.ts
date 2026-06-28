import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { SearchResult } from '../common/types/production.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import type { SearchRepositoryInterface } from '../repositories/interfaces/search.repository.interface';

@Injectable()
export class SearchService {
  constructor(
    @Inject(REPOSITORY_TOKENS.search)
    private readonly searchRepository: SearchRepositoryInterface,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async search(q = '', planId?: string): Promise<SearchResult[]> {
    const baseResults = await this.searchRepository.search(q, planId);
    const knowledgeResults = this.knowledgeService.search({ q, planId }).map((item, index): SearchResult => ({
      id: `KNOWLEDGE-${item.id}-${index}`,
      planId: item.planId ?? planId ?? '',
      type: item.type,
      scope: item.planId && item.planId === planId ? 'current_plan' : 'global',
      title: item.title,
      subtitle: item.subtitle,
      matchedField: item.matchedField,
      snippet: item.snippet,
      status: item.status,
    }));
    return [...knowledgeResults, ...baseResults].slice(0, planId ? 30 : 24);
  }
}
