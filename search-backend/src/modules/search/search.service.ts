import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

const DISCLAIMER = '합격 가능성·입결은 추정치이며 합격을 보장하지 않습니다.';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 2: 전문검색(FTS, search_tsv) 랭킹 + 정형 필터 + 정렬 + 페이지네이션.
   * 전제: prisma/sql/01_search_extras.sql 적용(search_tsv 생성 컬럼 + GIN 인덱스).
   * (Phase 3에서 pgvector 벡터점수와 하이브리드 결합 예정)
   */
  async search(dto: SearchQueryDto) {
    const whereParams: any[] = [];
    const where: string[] = [];
    const add = (v: any) => {
      whereParams.push(v);
      return `$${whereParams.length}`;
    };

    let rankExpr = '0::float4';
    if (dto.q) {
      const p = add(dto.q);
      where.push(`search_tsv @@ websearch_to_tsquery('simple', ${p})`);
      rankExpr = `ts_rank(search_tsv, websearch_to_tsquery('simple', ${p}))`;
    }
    if (dto.trackType) where.push(`track_type = ${add(dto.trackType)}`);
    if (dto.curriculum) where.push(`curriculum = ${add(dto.curriculum)}`);
    if (dto.region) where.push(`region ILIKE ${add(`%${dto.region}%`)}`);
    if (dto.field) where.push(`field_general ILIKE ${add(`%${dto.field}%`)}`);
    if (dto.fieldMid) where.push(`field_mid ILIKE ${add(`%${dto.fieldMid}%`)}`);
    if (dto.year) where.push(`year = ${add(dto.year)}`);
    if (dto.hasInterview !== undefined) where.push(`has_interview = ${add(dto.hasInterview === 'true')}`);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sort = dto.sort ?? (dto.q ? 'relevance' : 'year');
    const orderSql =
      sort === 'relevance' && dto.q
        ? 'ORDER BY relevance DESC, year DESC'
        : sort === 'recruitment'
          ? 'ORDER BY recruitment_number DESC NULLS LAST, year DESC'
          : 'ORDER BY year DESC, university_name ASC';

    const countRows = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*)::bigint AS count FROM search.srch_admission ${whereSql}`,
      ...whereParams,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limitPh = `$${whereParams.length + 1}`;
    const offsetPh = `$${whereParams.length + 2}`;
    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, track_type, curriculum, year, university_name, region, establishment_type,
              department_name, field_general, field_mid, field_minor, admission_type, admission_name,
              recruitment_number, has_interview, csat_required, ${rankExpr} AS relevance
       FROM search.srch_admission
       ${whereSql}
       ${orderSql}
       LIMIT ${limitPh} OFFSET ${offsetPh}`,
      ...whereParams,
      dto.pageSize,
      (dto.page - 1) * dto.pageSize,
    );

    return {
      total,
      page: dto.page,
      pageSize: dto.pageSize,
      totalPages: Math.ceil(total / dto.pageSize),
      sort,
      items,
      disclaimer: DISCLAIMER,
    };
  }

  /** 필터 UI용 facet 집계 (현재는 전체 기준; 필요 시 필터 반영 확장) */
  async facets() {
    const [byTrack, byCurriculum, byField] = await Promise.all([
      this.prisma.srchAdmission.groupBy({ by: ['trackType'], _count: { _all: true } }),
      this.prisma.srchAdmission.groupBy({ by: ['curriculum'], _count: { _all: true } }),
      this.prisma.srchAdmission.groupBy({
        by: ['fieldGeneral'],
        _count: { _all: true },
        orderBy: { _count: { fieldGeneral: 'desc' } },
        take: 20,
      }),
    ]);
    const fmt = (rows: any[], key: string) =>
      rows.map((r) => ({ value: r[key], count: r._count._all }));
    return {
      trackType: fmt(byTrack, 'trackType'),
      curriculum: fmt(byCurriculum, 'curriculum'),
      fieldGeneral: fmt(byField, 'fieldGeneral'),
    };
  }

  /** 전형 비교: 여러 id를 한 번에 조회 */
  async compare(ids: number[]) {
    if (!ids.length) return { items: [], disclaimer: DISCLAIMER };
    const items = await this.prisma.srchAdmission.findMany({
      where: { id: { in: ids } },
    });
    return { items, disclaimer: DISCLAIMER };
  }

  async findOne(id: number) {
    return this.prisma.srchAdmission.findUnique({ where: { id } });
  }
}
