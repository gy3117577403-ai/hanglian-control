import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ConnectorParamsController } from './connector-params.controller';
import { ConnectorParamsService } from './connector-params.service';

@Module({
  imports: [StorageModule],
  controllers: [ConnectorParamsController],
  providers: [ConnectorParamsService],
})
export class ConnectorParamsModule {}
