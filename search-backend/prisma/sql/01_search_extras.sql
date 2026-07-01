-- Prisma 마이그레이션이 표현하지 못하는 search 스키마 부가 객체.
-- `npx prisma migrate dev` (테이블 생성) 후 1회 적용:
--   psql "$DATABASE_URL" -f prisma/sql/01_search_extras.sql
-- (CI/prod에서는 migrate deploy 직후 동일 적용)

SET search_path TO search;

-- 1) 전문검색(FTS): description_text 기반 tsvector 생성 컬럼 + GIN 인덱스
ALTER TABLE srch_admission
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(description_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_srch_admission_tsv
  ON srch_admission USING GIN (search_tsv);

-- 2) 벡터검색(pgvector): 임베딩 ANN 인덱스
--    초기 데이터가 적으면 ivfflat의 lists를 작게. 데이터 규모 커지면 hnsw 고려.
--    (ivfflat 인덱스는 데이터가 어느 정도 적재된 후 생성/REINDEX 하는 것이 품질에 좋음)
CREATE INDEX IF NOT EXISTS idx_srch_embedding_vec
  ON srch_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3) 자주 쓰는 필터 보조 인덱스 (Prisma @@index 외 추가분)
CREATE INDEX IF NOT EXISTS idx_srch_admission_univ ON srch_admission (university_name);
CREATE INDEX IF NOT EXISTS idx_srch_admission_field ON srch_admission (field_general);
