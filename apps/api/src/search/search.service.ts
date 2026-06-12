import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { SearchResult } from '../common/types/production.types';
import type { SearchRepositoryInterface } from '../repositories/interfaces/search.repository.interface';

@Injectable()
export class SearchService {
  constructor(
    @Inject(REPOSITORY_TOKENS.search)
    private readonly searchRepository: SearchRepositoryInterface,
  ) {}

  async search(q = '', planId?: string): Promise<SearchResult[]> {
    return this.searchRepository.search(q, planId);
  }
}
