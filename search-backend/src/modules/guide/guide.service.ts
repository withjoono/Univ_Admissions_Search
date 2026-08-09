import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // 프로젝트 PrismaService 경로에 맞게 조정
import { VertexService } from './vertex.service';
import { resolveCosineOp, resolveVectorType } from './vector-type';

export interface GuideSearchFilter {
  category?: string;
  region?: string;
  university?: string;
  keyword?: string;   // search_text 부분일치
  year?: number;
  take?: number;
}

@Injectable()
export class GuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vertex: VertexService,
  ) {}

  /** ① 정형 목록 검색 — SQL 필터(정확·저비용). AI 비용 없음. */
  async searchGuideAdmissions(f: GuideSearchFilter) {
    const where: any = { year: f.year ?? 2027 };
    if (f.category) where.category = f.category;
    if (f.region) where.region = { contains: f.region };
    if (f.university) where.universityName = { contains: f.university };
    if (f.keyword) where.searchText = { contains: f.keyword };
    return this.prisma.srchGuideAdmission.findMany({
      where,
      take: f.take ?? 100,
      orderBy: [{ region: 'asc' }, { universityName: 'asc' }],
    });
  }

  /** ② 서술형 근거 검색 — pgvector 코사인 최근접 Top-K. */
  async retrieveChunks(question: string, k = 6, year = 2027) {
    const qvec = await this.vertex.embedQuery(question);
    const lit = `[${qvec.join(',')}]`;
    const vec = await resolveVectorType(this.prisma); // 예: "infocast".vector
    const op = await resolveCosineOp(this.prisma);    // 예: OPERATOR("infocast".<=>)
    // embedding <=> query 로 최근접 정렬 (작을수록 유사)
    const rows = await this.prisma.$queryRawUnsafe<
      { id: number; doc: string; title: string; page: number; text: string; dist: number }[]
    >(
      `SELECT c.id, c.doc, c.title, c.page, c.text,
              e.embedding ${op} $1::${vec} AS dist
         FROM search.srch_knowledge_chunk c
         JOIN search.srch_knowledge_embedding e ON e.chunk_id = c.id
        WHERE c.year = $2
        ORDER BY e.embedding ${op} $1::${vec}
        LIMIT $3`,
      lit, year, k,
    );
    return rows;
  }

  /** ③ RAG 조언 — 근거 검색 후 Gemini(프롬프트 캐싱)로 답변 생성. */
  async ask(question: string, opts?: { profile?: string; k?: number; year?: number }) {
    const chunks = await this.retrieveChunks(question, opts?.k ?? 6, opts?.year ?? 2027);
    const contexts = chunks.map((c) => ({ ref: `${c.title} p.${c.page}`, text: c.text }));
    const answer = await this.vertex.answerGrounded(question, contexts, opts?.profile);
    return {
      answer,
      sources: chunks.map((c) => ({ doc: c.doc, title: c.title, page: c.page })),
      disclaimer: '합격 가능성·경쟁률·입결은 추정치이며 보장이 아닙니다.',
    };
  }
}
