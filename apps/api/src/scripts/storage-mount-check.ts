import { StorageConfigService } from '../storage/storage.config';
import { StorageMountCheckService } from '../storage/storage-mount-check.service';

async function main() {
  const service = new StorageMountCheckService(new StorageConfigService());
  const result = await service.runProbe();
  console.log(JSON.stringify(result, null, 2));
  if (!result.lastMountCheck?.ok) process.exit(1);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
