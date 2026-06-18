import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../storage.service';
import { StorageStatusDto } from '../dto/storage-status.dto';

@ApiTags('storage')
@Controller('storage')
export class StorageStatusController {
  constructor(private readonly storageService: StorageService) {}

  @Get('status')
  @ApiOperation({ summary: 'Return safe storage configuration status without secrets or remote checks.' })
  @ApiOkResponse({ type: StorageStatusDto })
  getStatus() {
    return this.storageService.getSafeStatus();
  }
}
