import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: '查询本地开发审计记录' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
