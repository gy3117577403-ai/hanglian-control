import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../storage.service';
import { StorageStatusDto } from '../dto/storage-status.dto';
import { StorageMountCheckService } from '../storage-mount-check.service';

@ApiTags('storage')
@Controller('storage')
export class StorageStatusController {
  constructor(
    private readonly storageService: StorageService,
    private readonly mountCheckService: StorageMountCheckService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Return safe storage configuration status without secrets or remote checks.' })
  @ApiOkResponse({ type: StorageStatusDto })
  getStatus() {
    return this.storageService.getSafeStatus();
  }

  @Get('mount-readiness')
  @ApiOperation({ summary: 'Return read-only storage mount readiness without writing probe files.' })
  getMountReadiness() {
    return this.mountCheckService.getReadiness();
  }
}
