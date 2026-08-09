-- 진학지도 자료 pgvector 보조 설정
-- `npx prisma migrate dev` 로 테이블이 생성된 뒤 1회 실행(또는 마이그레이션 SQL에 포함).
-- vector 컬럼은 Prisma가 Unsupported로 만들므로, ANN 인덱스는 여기서 직접 건다.

-- vector 확장은 이 인스턴스에서 infocast 스키마에 설치돼 있다(init 마이그레이션 참조).
-- vector_cosine_ops 오퍼레이터 클래스 해석을 위해 search_path에 포함시킨다.
SET search_path TO search, infocast, public;

-- pgvector 확장 (이미 있으면 무시됨)
CREATE EXTENSION IF NOT EXISTS vector;

-- 코사인 거리 기준 HNSW 인덱스 (질의 임베딩과 근접 청크 검색 가속)
CREATE INDEX IF NOT EXISTS idx_srch_knowledge_embedding_hnsw
  ON search.srch_knowledge_embedding
  USING hnsw (embedding vector_cosine_ops);

-- (선택) 목록형 검색텍스트 한국어 부분일치용 trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_srch_guide_admission_search_trgm
  ON search.srch_guide_admission
  USING gin (search_text gin_trgm_ops);
