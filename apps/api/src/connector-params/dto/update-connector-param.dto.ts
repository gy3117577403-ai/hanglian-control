import { PartialType } from '@nestjs/swagger';
import { CreateConnectorParamDto } from './create-connector-param.dto';

export class UpdateConnectorParamDto extends PartialType(CreateConnectorParamDto) {}
