import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecycleBinQueryDto } from './dto/recycle-bin-query.dto';
import { RecycleBinService } from './recycle-bin.service';

@ApiTags('recycle-bin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recycle-bin')
export class RecycleBinController {
  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Get()
  @ApiOperation({ summary: 'List deleted documents for ArkTS recycle bin.' })
  findAll(@Query() query: RecycleBinQueryDto) {
    return this.recycleBinService.findAll(query);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore one document from recycle bin.' })
  restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.recycleBinService.restore(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete one recycled document.' })
  permanentDelete(@Param('id') id: string) {
    return this.recycleBinService.permanentDelete(id);
  }
}
