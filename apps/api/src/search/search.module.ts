import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [KnowledgeModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
