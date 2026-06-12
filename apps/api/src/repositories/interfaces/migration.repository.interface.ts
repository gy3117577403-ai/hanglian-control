import type { MigrationPreview, MigrationSeedExport } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface MigrationRepositoryInterface {
  getPreview(): MaybePromise<MigrationPreview>;
  exportSeed(): MaybePromise<MigrationSeedExport>;
}
