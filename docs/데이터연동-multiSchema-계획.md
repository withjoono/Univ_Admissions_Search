# 데이터 연동 실행계획 — Prisma multiSchema (직접 읽기)

> **결정**: 수시(`susi`)·정시(`jungsi`) 전형 데이터를 같은 Cloud SQL 안에서 **읽기 전용 cross-schema**로 가져와 검색앱 `search` 스키마에 동기화·인덱싱한다.
> **상위 문서**: [`기획서.md`](./기획서.md) §2.4
> **작성일**: 2026-06-29

---

## 1. 목표와 원칙

- **읽기 전용**: 검색앱은 `susi`/`jungsi` 스키마를 **절대 쓰지 않는다**(SELECT만). 공유 DB 사고 방지.
- **소유 경계**: 검색앱이 마이그레이션으로 관리하는 것은 **`search` 스키마뿐**. 외부 스키마엔 어떤 DDL도 발생시키지 않는다.
- **결합 격리**: 외부 스키마에 대한 의존을 **한 곳(읽기 전용 리포지토리/raw 쿼리)** 에 모은다. 그쪽 스키마가 바뀌면 그 파일과 통합테스트에서만 깨지게.
- **멱등성**: 동기화는 몇 번을 돌려도 같은 결과(upsert 기반).

---

## 2. DB 권한 설계 (가장 중요한 안전장치)

코드 실수와 무관하게 **DB 레벨에서 쓰기를 원천 차단**한다. 검색앱 전용 읽기 계정을 따로 둔다.

```sql
-- 1) 검색앱 전용 유저 (애플리케이션 연결용)
CREATE USER search_app WITH PASSWORD '***';

-- 2) search 스키마: 소유/풀권한 (검색앱이 만들고 관리)
CREATE SCHEMA IF NOT EXISTS search AUTHORIZATION search_app;

-- 3) susi / jungsi 스키마: 읽기 전용만 부여
GRANT USAGE ON SCHEMA susi, jungsi TO search_app;
GRANT SELECT ON ALL TABLES IN SCHEMA susi, jungsi TO search_app;
-- 이후 새로 생기는 테이블도 자동 SELECT 허용
ALTER DEFAULT PRIVILEGES IN SCHEMA susi  GRANT SELECT ON TABLES TO search_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA jungsi GRANT SELECT ON TABLES TO search_app;

-- 4) pgvector 확장 (search 스키마 인덱싱용)
CREATE EXTENSION IF NOT EXISTS vector;
```

> 권한 부여는 각 스키마 소유자(susi/jungsi 백엔드 DB 유저) 또는 슈퍼유저(`tsuser`)가 실행해야 함. → susi/jungsi 담당과 1회 협의 필요.

---

## 3. Prisma / 스키마 구성

### 3.1 datasource & multiSchema
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")          // search_app 계정
  schemas  = ["search", "susi", "jungsi"] // 읽기용 외부 스키마 포함
}
```

### 3.2 외부 스키마 테이블을 안전하게 다루는 법 (마이그레이션 사고 방지)
multiSchema에 `susi`/`jungsi`를 넣으면 `prisma migrate`가 그 테이블까지 관리하려 들 수 있다(드리프트 시 ALTER/DROP 생성 위험). 두 가지 안전 패턴 중 택1:

- **패턴 A (권장) — 외부는 raw read, Prisma 모델은 `search`만**
  - `schema.prisma`에는 **`search` 스키마 모델만** 정의 → migrate가 외부 스키마를 절대 안 건드림.
  - `susi`/`jungsi` 조회는 `prisma.$queryRaw`(타입은 수동 interface)로 **읽기 전용 리포지토리**에 격리.
  - 가장 footgun이 적음. 외부 스키마 변경 영향이 raw 쿼리 1곳 + 통합테스트로 국한.

- **패턴 B — 외부도 모델로 introspect (타입 안전 우선)**
  - `prisma db pull`로 `susi`/`jungsi` 테이블을 `@@schema(...)` 모델로 가져와 타입 안전한 read.
  - 단, **migrate는 항상 `--create-only`로 생성 후 외부 스키마 관련 구문을 수동 제거**해야 안전. 운영 규율 필요.

> 본 계획은 **패턴 A로 진행**한다. (안전성·단순성 우선. 타입은 읽기 리포지토리에서 명시적으로 정의)

---

## 3.5 소스 스키마 실측 결과 (2026-06-29, jungsi-backend Prisma introspection 기준)

> 출처: `withjoono/jungsi`의 `jungsi-backend/prisma/schema.prisma` — multiSchema로 `hub`/`jungsi`/`susi`/`public` 전 스키마를 introspect 해둔 단일 파일. 검색앱이 그대로 참조 가능.

### 정시 (`jungsi` 스키마) — **비정규화 단일 테이블**
- **`js_admission`**: 전형 1행에 모든 정보 평탄화. 주요 컬럼:
  `year`, `admission_name`, `admission_type`, `general_field_name`, `detailed_fields`, `recruitment_number`, `selection_method`, `recruitment_name`, `csat_ratio`/`school_record_ratio`/`interview_ratio`/`other_ratio`, `csat_elements`/`csat_required`/`csat_optional`, 영어·한국사 등급환산(`english_grade_N_score`, `korean_history_*`), 위험도 `risk_plus/minus_1..5`, 누적백분위 cut, `university_id` → `susi.ss_university`.
- 자식: `js_admission_previous_result`(연도별 입결).
- → 매핑 단순: **js_admission 1행 = 검색 1건**.

### 수시 (`susi` 스키마) — **정규화 다중 테이블**
- **`ss_admission`** (전형 상위: `name`, `year`, `university_id`, `category_id`, `basic_type` enum)
  - 1:1 **`ss_admission_method`** — 교과/서류/면접/실기 비율, 2단계 비율, `eligibility`(지원자격), 학생부평가요소
  - N:M **`ss_admission_subtype`** (via `ss_admission_subtype_relations`) — 전형 세부유형명
  - 1:N **`ss_recruitment_unit`** (모집단위: `name`, `recruitment_number`, `code`, 계열 링크)
    - 1:1 `ss_recruitment_unit_interview` (면접 여부/방식)
    - 1:1 `ss_recruitment_unit_minimum_grade` (최저학력기준)
    - 1:N `ss_recruitment_unit_score` (50/70 cut, `risk_plus/minus_1..5`)
    - 1:N `ss_recruitment_unit_previous_result` (연도별: `grade_cut`, `competition_ratio`, `recruitment_number`)
    - 1:N `ss_recruitment_unit_pass_fail_record` (합불 평균등급)
- 계열 4단계: `ss_general_field` / `ss_major_field` > `ss_mid_field` > `ss_minor_field`
- **`ss_university`** (`region`, `name`, `code`, `establishment_type` enum) — **정시·수시 공용**(js_admission도 이걸 참조)
- → 매핑 복잡: **`ss_recruitment_unit` 1행 (+ 상위 admission/method/subtype JOIN) = 검색 1건**.

### 핵심 시사점 — 검색 단위 통일
정시는 1행=전형, 수시는 전형↔모집단위가 분리되어 있다. 검색의 최소 단위를 **(대학, 모집단위, 전형, 연도)** 로 통일한다:
| 소스 | 검색 1건의 grain |
|------|------------------|
| 정시 | `js_admission` 1행 |
| 수시 | `ss_recruitment_unit` 1행 + 상위(ss_admission/method/subtype) JOIN |

대학 정보는 양쪽 모두 `susi.ss_university`에서 가져온다(검색 region/대학명/설립유형 필터의 단일 소스).

---

## 4. `search` 스키마 데이터 모델 (검색앱 소유, prefix `srch_`)

> grain = **(대학, 모집단위, 전형, 연도)**. 정시·수시를 아래 한 모델로 평탄화.

| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `srch_admission` | 정규화된 통합 전형(grain=모집단위) | `id`, `track_type(SUSI/JEONGSI)`, `year`, `university_name`, `region`, `establishment_type`, `department_name`(모집단위), `field_general`/`field_major`/`field_mid`/`field_minor`(계열), `admission_type`, `admission_name`, `recruitment_number`, `ratios(jsonb: 수능/교과/서류/면접/실기)`, `csat_required`, `min_grade_desc`(최저학력), `has_interview`, `prev_results(jsonb: 연도별 입결/경쟁률)`, `risk_band(jsonb)`, `description_text`, `source_app`, `source_id`, `source_updated_at`, `synced_at` |
| `srch_admission` (인덱스) | 전문검색 | `search_tsv tsvector`(GENERATED) + GIN 인덱스 |
| `srch_embedding` | 임베딩 벡터 | `admission_id FK`, `embedding vector(N)`, `model`, `updated_at` + ivfflat/hnsw 인덱스 |
| `srch_sync_log` | 동기화 이력 | `id`, `source_app`, `started_at`, `finished_at`, `rows_read`, `rows_upserted`, `status`, `error` |

### 4.1 소스 → `srch_admission` 매핑 요약
| srch 컬럼 | 정시(js_admission) | 수시(ss_*) |
|-----------|--------------------|------------|
| university_name/region/establishment_type | `ss_university`(via university_id) | `ss_university`(via ss_admission.university_id) |
| department_name | `recruitment_name` | `ss_recruitment_unit.name` |
| field_* (계열) | `general_field_name`/`detailed_fields` | `ss_general/major/mid/minor_field` |
| admission_type/admission_name | `admission_type`/`admission_name` | `ss_admission_category`/`ss_admission.name` + `ss_admission_subtype` |
| recruitment_number | `recruitment_number` | `ss_recruitment_unit.recruitment_number` |
| ratios(jsonb) | `csat_ratio`/`school_record_ratio`/`interview_ratio`/`other_ratio` | `ss_admission_method`의 subject/document/interview/practical ratio |
| csat_required | `csat_required`/`csat_elements` | (수시 최저 → `min_grade_desc`) |
| min_grade_desc | `*_minimum_criteria` | `ss_recruitment_unit_minimum_grade.description` |
| has_interview | `interview_ratio`>0 | `ss_recruitment_unit_interview.is_reflected` |
| prev_results(jsonb) | `js_admission_previous_result` | `ss_recruitment_unit_previous_result` |
| risk_band(jsonb) | `risk_plus/minus_*` | `ss_recruitment_unit_score.risk_*` |

- `(source_app, source_id)` **UNIQUE** → upsert 키.
- `embedding` 차원 `N`은 채택한 Vertex 임베딩 모델에 맞춰 확정(§7.2 기획서).

---

## 5. 동기화(Sync) 모듈 설계 (NestJS)

```
src/modules/sync/
├── sync.module.ts
├── sync.service.ts          # 오케스트레이션(full / incremental)
├── sync.scheduler.ts        # @nestjs/schedule cron 또는 외부 트리거
├── sync.controller.ts       # POST /api/internal/sync (수동/Cloud Scheduler 트리거)
└── source/
    ├── susi.read-repository.ts    # susi 스키마 raw read (격리 지점)
    └── jungsi.read-repository.ts  # jungsi 스키마 raw read (격리 지점)
```

### 5.1 동작
1. **full sync**: 외부 전형 전체를 읽어 `srch_admission`에 upsert (초기 1회).
2. **incremental sync**: 외부 `updated_at`(또는 버전) > 마지막 동기화 시각인 행만 읽어 upsert (주기 실행).
3. 매핑: 수시/정시의 서로 다른 컬럼 → 공통 `srch_admission` 모델로 변환(매퍼 함수).
4. upsert 후 변경된 row만 §6 인덱싱 큐로 전달.
5. `srch_sync_log`에 결과 기록.

### 5.2 트리거 방식
- 1차: `@nestjs/schedule` cron(예: 매시/매일) — 단순.
- 권장: **Cloud Scheduler → `POST /api/internal/sync`** (App Engine 인스턴스 스케일다운돼도 동작, 재시도·모니터링 용이). 엔드포인트는 `ServiceAuthGuard`로 보호.

### 5.3 안전
- 전부 **읽기 전용 쿼리** + upsert는 `search` 스키마에만.
- 배치 단위 트랜잭션 + 부분 실패 로깅, 재시도 멱등.

---

## 6. 인덱싱 (임베딩 + 전문검색)

1. 동기화로 바뀐 전형의 `description_text` → **Vertex AI text-embedding** 호출 → `srch_embedding`에 저장(모델/차원 기록).
2. 비용·레이트 관리: 변경분만 임베딩, 배치 호출, 실패 재시도.
3. 전문검색(FTS): `search_tsv`는 GENERATED 컬럼(또는 트리거)로 자동 생성 → GIN 인덱스.
4. 벡터 인덱스: 데이터 규모에 따라 `ivfflat`(중소) 또는 `hnsw`(정확도/속도) 선택, `lists`/`m` 튜닝.

---

## 7. 강결합 리스크 완화 (multiSchema의 유일한 약점 대응)

- **격리**: 외부 스키마 접근은 `*.read-repository.ts` 2개 파일에만. 나머지 코드는 공통 모델만 의존.
- **권한**: §2의 읽기 전용 계정 → 코드가 실수로 써도 DB가 거부.
- **빠른 실패 테스트**: 통합테스트에서 외부 전형 쿼리가 기대 컬럼/타입을 반환하는지 검증 → susi/jungsi 스키마 변경 시 CI에서 즉시 감지.
- **협의 채널**: susi/jungsi 전형 테이블 구조 변경 시 알림 받도록 1회 합의(또는 변경감지 모니터).
- **모니터링**: `srch_sync_log` 실패율·지연 알림(Cloud Logging/Monitoring).

---

## 8. 실행 단계 (체크리스트)

**Step 0 — 사전 확인**
- [ ] susi/jungsi 전형 테이블 실제 구조 확보(`\d susi.*` / Prisma schema) → 매핑 설계 확정
- [ ] `search_app` 읽기 전용 권한 부여(스키마 소유자 협조)

**Step 1 — 스캐폴드 & 스키마**
- [ ] `search-backend`(NestJS+Prisma) 생성, `DATABASE_URL`=search_app
- [ ] `pgvector` 확장, `search` 스키마 + `srch_*` 테이블 Prisma 마이그레이션
- [ ] 패턴 A 적용(외부 스키마는 모델 미포함)

**Step 2 — 동기화**
- [ ] `susi/jungsi.read-repository.ts` raw read + 매퍼
- [ ] full sync → `srch_admission` upsert 검증
- [ ] incremental sync(updated_at 기준) + `srch_sync_log`

**Step 3 — 인덱싱**
- [ ] Vertex 임베딩 연동 → `srch_embedding` + 벡터 인덱스
- [ ] FTS tsvector/GIN

**Step 4 — 운영화**
- [ ] Cloud Scheduler 트리거 + `ServiceAuthGuard`
- [ ] 통합테스트(스키마 드리프트 감지), 모니터링/알림

---

## 9. 검증 기준
- full sync 후 `srch_admission` 건수 = 외부 전형 건수와 일치.
- incremental sync가 변경분만 반영(불필요한 재임베딩 없음).
- 검색 쿼리는 `search` 스키마/벡터인덱스만 조회(외부 스키마 라이브 미접근).
- 외부 스키마에 대한 쓰기 시도 시 DB 거부 확인(권한 테스트).
