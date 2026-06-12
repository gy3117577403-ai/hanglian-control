import type { SearchResult } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface SearchRepositoryInterface {
  search(keyword: string, planId?: string): MaybePromise<SearchResult[]>;
}
