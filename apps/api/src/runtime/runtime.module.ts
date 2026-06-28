import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { RuntimeController } from './runtime.controller';

@Module({
  imports: [StorageModule],
  controllers: [RuntimeController],
})
export class RuntimeModule {}
