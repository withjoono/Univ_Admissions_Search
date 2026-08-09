import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GuideService, GuideSearchFilter } from './guide.service';

@Controller('guide')
export class GuideController {
  constructor(private readonly guide: GuideService) {}

  /** 정형 목록 필터 검색: GET /guide/admissions?category=농어촌학생&region=서울 */
  @Get('admissions')
  admissions(@Query() q: GuideSearchFilter) {
    return this.guide.searchGuideAdmissions({
      ...q,
      year: q.year ? Number(q.year) : undefined,
      take: q.take ? Number(q.take) : undefined,
    });
  }

  /** 자연어 RAG 질의: POST /guide/ask { question, profile? } */
  @Post('ask')
  ask(@Body() body: { question: string; profile?: string; k?: number; year?: number }) {
    return this.guide.ask(body.question, { profile: body.profile, k: body.k, year: body.year });
  }
}
