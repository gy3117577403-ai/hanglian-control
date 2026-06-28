import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { RecycleBinController } from './recycle-bin.controller';
import { RecycleBinService } from './recycle-bin.service';

@Module({
  imports: [StorageModule],
  controllers: [RecycleBinController],
  providers: [RecycleBinService],
})
export class RecycleBinModule {}
