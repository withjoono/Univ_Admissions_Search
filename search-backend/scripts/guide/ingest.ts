/**
 * 진학지도 자료 적재 스크립트
 * ------------------------------------------------------------------
 * 1) scripts/guide/out/guide_admissions.json   → search.srch_guide_admission (정형, 임베딩 없음)
 * 2) scripts/guide/out/guide_knowledge_chunks.json → search.srch_knowledge_chunk + _embedding (RAG 벡터)
 *
 * 실행:
 *   cd search-backend
 *   npx prisma migrate deploy            # 테이블 생성
 *   psql "$DATABASE_URL" -f prisma/sql/guide_pgvector.sql   # 벡터/trgm 인덱스
 *   GOOGLE_CLOUD_PROJECT=... GOOGLE_CLOUD_LOCATION=us-central1 \
 *     npx ts-node scripts/guide/ingest.ts
 *
 * 임베딩: Vertex AI gemini-embedding-001, outputDimensionality=768 (기존 SrchEmbedding과 차원 통일).
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { resolveVectorType } from '../../src/modules/guide/vector-type';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});
const EMBED_MODEL = 'gemini-embedding-001';
const DIM = 768;
const YEAR = 2027;
const OUT = path.join(__dirname, 'out');

const pick = (r: Record<string, any>, keys: string[]) => {
  for (const k of keys) if (r[k] != null && String(r[k]).trim() !== '') return String(r[k]).trim();
  return null;
};
const toInt = (s: string | null) => {
  if (!s) return null;
  const m = s.replace(/[(),]/g, '').match(/\d+/); // "(36)" 같은 미확정 표기도 숫자만
  return m ? parseInt(m[0], 10) : null;
};

async function ingestGuideAdmissions() {
  const rows: Record<string, any>[] = JSON.parse(fs.readFileSync(path.join(OUT, 'guide_admissions.json'), 'utf-8'));
  await prisma.srchGuideAdmission.deleteMany({ where: { year: YEAR } });

  const data = rows.map((r) => {
    const region = pick(r, ['지역', '권역', '계열']);
    const univ = pick(r, ['대학']) || '(미상)';
    const dept = pick(r, ['모집단위']);
    const atype = pick(r, ['전형유형']);
    const aname = pick(r, ['전형명']);
    const recText = pick(r, ['모집인원', '모집인원 (명)', '모집인원(명)']);
    const method = pick(r, ['전형방법']);
    const csat = pick(r, ['수능최저 학력기준', '수능최저학력기준', '수능최저학력기준/모집단위']);
    const note = pick(r, ['비고']);
    const searchText = [r._category, region, univ, dept, atype, aname, method, csat, note]
      .filter(Boolean).join(' ');
    return {
      year: YEAR,
      category: r._category,
      region,
      universityName: univ,
      departmentName: dept,
      admissionType: atype,
      admissionName: aname,
      recruitmentText: recText,
      recruitmentNumber: toInt(recText),
      method,
      csatMinDesc: csat,
      note,
      searchText,
      raw: r,
      sourceFile: r._source,
      sourcePage: r._page ?? 0,
    };
  });

  // createMany는 Json/대량에 빠름
  const CHUNK = 500;
  for (let i = 0; i < data.length; i += CHUNK) {
    await prisma.srchGuideAdmission.createMany({ data: data.slice(i, i + CHUNK) });
  }
  console.log(`[guide-admissions] ${data.length}행 적재`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 임베딩 호출. 429(분당 토큰 쿼터)·5xx는 지수 백오프로 재시도. */
async function embedBatch(texts: string[], tries = 6): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: texts,
        config: { outputDimensionality: DIM, taskType: 'RETRIEVAL_DOCUMENT' },
      });
      return (res.embeddings ?? []).map((e) => e.values as number[]);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const retryable = /RESOURCE_EXHAUSTED|429|50\d|UNAVAILABLE|DEADLINE/i.test(msg);
      if (!retryable || attempt >= tries - 1) throw e;
      const wait = Math.min(60_000, 10_000 * 2 ** attempt); // 10s,20s,40s,60s...
      console.log(`  ⏳ 쿼터/일시오류 → ${wait / 1000}s 대기 후 재시도 (${attempt + 1}/${tries - 1})`);
      await sleep(wait);
    }
  }
}

async function ingestKnowledge() {
  const chunks: any[] = JSON.parse(fs.readFileSync(path.join(OUT, 'guide_knowledge_chunks.json'), 'utf-8'));

  // 1) 청크 본문 확보 — 이미 같은 개수가 적재돼 있으면 재사용(임베딩 재과금 방지, 재개 가능).
  let rows = await prisma.srchKnowledgeChunk.findMany({
    where: { year: YEAR }, orderBy: { id: 'asc' }, select: { id: true, text: true },
  });
  if (rows.length !== chunks.length) {
    await prisma.srchKnowledgeChunk.deleteMany({ where: { year: YEAR } });
    await prisma.srchKnowledgeChunk.createMany({
      data: chunks.map((c) => ({
        year: YEAR, doc: c.doc, title: c.title, page: c.page, text: c.text, sourceFile: c.doc,
      })),
    });
    rows = await prisma.srchKnowledgeChunk.findMany({
      where: { year: YEAR }, orderBy: { id: 'asc' }, select: { id: true, text: true },
    });
    console.log(`[knowledge] ${rows.length}청크 신규 저장`);
  } else {
    console.log(`[knowledge] 기존 ${rows.length}청크 재사용`);
  }

  // 2) 아직 임베딩이 없는 청크만 골라낸다.
  const doneRows = await prisma.$queryRawUnsafe<{ chunk_id: number }[]>(
    `SELECT e.chunk_id FROM search.srch_knowledge_embedding e
       JOIN search.srch_knowledge_chunk c ON c.id = e.chunk_id
      WHERE c.year = $1`, YEAR,
  );
  const done = new Set(doneRows.map((r) => r.chunk_id));
  const todo = rows.filter((r) => !done.has(r.id));
  console.log(`[knowledge] 임베딩 대상 ${todo.length}개 (완료 ${done.size}개 건너뜀)`);
  if (todo.length === 0) return;

  // 3) 배치 임베딩 → 벡터 저장.
  //    vector 타입은 이 인스턴스에서 infocast 스키마에 있어 search_path로 해석되지 않는다 → 정규화된 이름 사용.
  //    분당 입력 토큰 쿼터가 있으므로 작은 배치 + 간격 두기.
  const vec = await resolveVectorType(prisma);
  const BATCH = 20;
  const PACE_MS = 6_000; // 배치당 최소 간격 (≈ 분당 20만자 이하로 유지)
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const started = Date.now();
    const vecs = await embedBatch(slice.map((c) => c.text));
    for (let j = 0; j < slice.length; j++) {
      const lit = `[${vecs[j].join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO search.srch_knowledge_embedding (chunk_id, embedding, model, updated_at)
         VALUES ($1, $2::${vec}, $3, now())
         ON CONFLICT (chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, updated_at = now()`,
        slice[j].id, lit, EMBED_MODEL,
      );
    }
    console.log(`  임베딩 ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    const rest = PACE_MS - (Date.now() - started);
    if (i + BATCH < todo.length && rest > 0) await sleep(rest);
  }
}

async function main() {
  await ingestGuideAdmissions();
  await ingestKnowledge();
  console.log('✅ 적재 완료');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
