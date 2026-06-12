import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'planId', required: false })
  search(@Query('q') q = '', @Query('planId') planId?: string) {
    return this.searchService.search(q, planId);
  }
}
