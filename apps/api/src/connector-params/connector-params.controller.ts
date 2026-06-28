import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectorParamsService } from './connector-params.service';
import { ConnectorParamQueryDto } from './dto/connector-param-query.dto';
import { CreateConnectorParamDto } from './dto/create-connector-param.dto';
import { UpdateConnectorParamDto } from './dto/update-connector-param.dto';

@ApiTags('connector-params')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connector-params')
export class ConnectorParamsController {
  constructor(private readonly connectorParamsService: ConnectorParamsService) {}

  @Get()
  @ApiOperation({ summary: 'List connector process parameters.' })
  findAll(@Query() query: ConnectorParamQueryDto) {
    return this.connectorParamsService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create one connector process parameter.' })
  create(@Body() dto: CreateConnectorParamDto) {
    return this.connectorParamsService.create(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Accept connector parameter Excel import.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  import(@UploadedFile() file?: Express.Multer.File) {
    return this.connectorParamsService.importFile(file);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="connector-params.csv"')
  @ApiOperation({ summary: 'Export connector process parameters as CSV.' })
  export(@Query() query: ConnectorParamQueryDto) {
    return this.connectorParamsService.exportCsv(query);
  }

  @Post('import-one')
  @ApiOperation({ summary: 'Import or update one connector model.' })
  importOne(@Body() dto: CreateConnectorParamDto) {
    return this.connectorParamsService.importOne(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one connector process parameter.' })
  update(@Param('id') id: string, @Body() dto: UpdateConnectorParamDto) {
    return this.connectorParamsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete one connector process parameter.' })
  remove(@Param('id') id: string) {
    return this.connectorParamsService.softDelete(id);
  }
}
