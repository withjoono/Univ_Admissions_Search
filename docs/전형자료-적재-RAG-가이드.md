# 진학지도 자료 적재 & RAG 가이드

2027 진학지도 PDF 자료집(특별전형 목록 + 서술형 해설)을 `search` 스키마에 적재하고,
정형 필터 검색 + 서술형 RAG로 서비스하는 파이프라인.

> 이 자료는 susi/jungsi 라이브 전형(multiSchema)과 **별개 출처**다.
> 정형 목록은 SQL 필터, 서술형 해설은 pgvector RAG로 나눠 처리한다.

## 데이터 두 갈래

| 갈래 | 소스 PDF | 저장 테이블 | 검색 방식 |
|---|---|---|---|
| ① 특별전형·예체능 목록(정형 표) | 농어촌/기초생활/기회균형/다문화/장애인/지역인재/특성화고 + 예체능(미술·연기연출·음악·응용예술·체육·전공자율) 비실기 | `srch_guide_admission` | SQL 필터 (지역·대학·카테고리·키워드) — **AI 비용 없음** |
| ② 서술형 해설 | 계열별 분석(총론)·대입상담 역량강화 자료집·지역의사 선발전형 안내 | `srch_knowledge_chunk` + `srch_knowledge_embedding` | pgvector 최근접 → Gemini RAG |

현재 추출 결과: **목록 2,705행 / 서술형 1,022청크(약 39만 토큰)**.
추출본은 `search-backend/scripts/guide/out/`에 JSON으로 포함돼 있다(바로 적재 가능).

## 실행 순서

```bash
cd search-backend

# 0) (원본에서 다시 추출할 때만) — 이미 out/*.json 이 있으면 건너뛴다
pip install pdfplumber
GUIDE_PDF_DIR=/원본PDF폴더 python3 scripts/guide/extract_tables.py
GUIDE_PDF_DIR=/원본PDF폴더 python3 scripts/guide/chunk_prose.py

# 1) 마이그레이션 (search 스키마에 테이블 3종 생성)
npx prisma migrate dev --name add_guide_tables
psql "$DATABASE_URL" -f prisma/sql/guide_pgvector.sql   # HNSW/trgm 인덱스

# 2) 적재 + 임베딩 (Vertex)
export GOOGLE_CLOUD_PROJECT=ts-back-nest-479305
export GOOGLE_CLOUD_LOCATION=us-central1
npx ts-node scripts/guide/ingest.ts
```

## API

`AppModule` imports 에 `GuideModule` 추가 후:

- `GET  /guide/admissions?category=농어촌학생&region=서울` — 정형 목록 필터
- `POST /guide/ask { "question": "면접 없는 서울 농어촌 종합전형 알려줘", "profile": "선택" }` — RAG 조언

응답에는 `answer`, `sources`(문서·페이지), `disclaimer`(추정치 안내)가 포함된다.

## 프롬프트 캐싱 (적용됨)

`vertex.service.ts`가 두 단계로 입력 토큰 비용을 줄인다.

1. **명시적 Context Cache** — 질의와 무관하게 고정인 시스템 지시(정책·용어·면책)를
   `ai.caches.create()`로 1회 생성해 TTL(1시간) 동안 재사용. 매 질의마다 같은 시스템
   프롬프트를 다시 과금하지 않음(캐시 입력 단가 ≈ 일반 입력의 1/10).
   - 캐시 최소 토큰 미달 등으로 생성 실패 시 자동으로 인라인 시스템 지시로 폴백.
2. **암시적 캐싱** — Gemini 2.5 Flash가 반복되는 prefix에 대해 자동 적용(코드 불필요).

## 비용 (요약)

임베딩 gemini-embedding-001 $0.15/1M, 생성 Gemini 2.5 Flash $0.30(입력)/$2.50(출력) 기준.

- **최초 임베딩(1회)**: 약 39만 토큰 → 약 $0.06 (사실상 무료)
- **저장**: 벡터 ~1,000청크 = 수 MB. 기존 Cloud SQL에 얹음 → 추가 0원
- **질의 1건**: 임베딩 + Flash 생성 ≈ $0.002 (프롬프트 캐싱으로 입력분은 더 낮아짐)
  - 정형 목록 검색은 SQL이라 AI 비용 없음

## 주의

- 합격 가능성·경쟁률·입결은 추정치 — 응답·UI에 항상 명시(CLAUDE.md 규칙).
- **저작권**: 원문은 한국대학교육협의회·서울시교육청 발행물("무단전재·재배포 금지").
  RAG는 근거 요약·인용 위주로 쓰고, 원문 대량 재배포는 별도 검토.
- 연도 버전은 `year` 필드로 관리(내년 자료 교체 시 `deleteMany({year})` 후 재적재).
- 이미지로만 된 표 페이지는 OCR 미적용이라 추출에서 빠질 수 있음(현재 스코프 제외).
