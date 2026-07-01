import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '전형 검색 (FTS 랭킹 + 필터 + 정렬 + 페이지네이션)' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Get('facets')
  @ApiOperation({ summary: '필터 facet 집계' })
  facets() {
    return this.searchService.facets();
  }

  @Get('compare')
  @ApiOperation({ summary: '전형 비교 (ids=1,2,3)' })
  @ApiQuery({ name: 'ids', example: '1,2,3' })
  compare(@Query('ids') ids?: string) {
    const parsed = (ids ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    if (parsed.length > 5) throw new BadRequestException('비교는 최대 5개까지 가능합니다.');
    return this.searchService.compare(parsed);
  }

  @Get(':id')
  @ApiOperation({ summary: '전형 상세' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.searchService.findOne(id);
  }
}
