# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Overview

**Univ_Admissions_Search** — 거북스쿨 위성앱. 수시·정시 전형 통합 검색 + 생기부/성적/분석결과 기반 맞춤 AI 조언. 고1~고3 전체(2015·2022 교육과정).

설계 문서는 `docs/` 참조: 기획서.md(마스터), 데이터연동-multiSchema-계획.md, Hub-SSO-연동.md, 실행착수-체크리스트.md.

## Monorepo
- **`search-backend/`** — NestJS 10 + Prisma + PostgreSQL (yarn). 포트 4011.
- **`search-frontend/`** — React 18 + Vite + TanStack Router + Zustand (npm). 포트 3011.

| 서비스 | 포트 |
|---|---|
| Frontend (Vite) | 3011 |
| Backend (NestJS) | 4011 |
| Swagger | http://localhost:4011/swagger |

> Dev 포트 표준(생태계 충돌 방지): Hub 3000/4000 · Susi 3001/4001 · Jungsi 3002/4002 · ExamHub 3003/4003 · StudyPlanner 3004/4004 · Mogo 3009/4009 · **Search 3011/4011**.

## 배포
- 백엔드 → Google App Engine, service명 `search-backend` (프로젝트 `ts-back-nest-479305`).
- 프론트 → Firebase Hosting, site `search-front` (프로젝트 `ts-front-479305`).
- Firebase 배포는 **항상 `firebase deploy --only hosting:search-front`** (target 생략 금지 — 다른 앱 site 덮어쓰기 사고 방지).

## 데이터 아키텍처 (중요)

**공유 단일 Cloud SQL PostgreSQL** (`geobukschool_prod`/`_dev`), 스키마 격리. 본 앱은 `search` 스키마 소유.

두 갈래 데이터 경로:
1. **전형 데이터** (검색 대상): `susi`/`jungsi` 스키마를 **읽기 전용**으로 직접 읽어 `search` 스키마에 색인.
   - Prisma 모델은 `search` 스키마만 정의(마이그레이션 대상). 외부 스키마는 `prisma.$queryRaw` 읽기 전용으로 격리(`src/modules/sync/source/*`).
   - DB 계정 `search_app`은 susi/jungsi에 SELECT만 보유(쓰기 시 DB가 거부).
2. **사용자 프로파일** (개인화 입력): **Hub "입시 프로파일" API** 호출로 수신. 생기북/모고/susi/jungsi의 사용자 분석결과를 검색앱이 직접 읽지 않는다.

## 인증 (SSO)
Hub가 JWT 발급(HS512, **Base64 secret** — `Buffer.from(secret,'base64')`로 디코드). 위성앱 토큰교환 방식: client→Hub login(?redirect=)→sso_code→client backend가 Hub `/auth/sso/verify-code` 호출. `AUTH_JWT_SECRET`은 절대 변경 금지(전 생태계 세션 무효화). 상세 `docs/Hub-SSO-연동.md`.

서버-서버 호출(Hub 프로파일 API 등): `AUTH_SERVICE_SECRET` 서비스 토큰 + `X-Service-Id: search`.

## 명령어
### Backend (`search-backend/`)
```bash
yarn start:dev          # 개발(watch), 포트 4011
yarn build              # tsc → dist/
npx prisma migrate dev  # search 스키마 마이그레이션 생성/적용
npx prisma generate     # 클라이언트 재생성
npx prisma studio       # DB GUI
```
### Frontend (`search-frontend/`)
```bash
npm run dev             # Vite, 포트 3011
npm run build           # 프로덕션 빌드
```

## 핵심 제약
- **외부 스키마(susi/jungsi)에 절대 쓰기 금지** — 읽기 전용. 권한+코드 양쪽에서 강제.
- Prisma 마이그레이션은 **`search` 스키마만** 관리(외부 스키마 DDL 금지).
- JWT secret 포맷(Base64+HS512) 변경 금지.
- 합격가능성/입결은 추정치이며 보장 아님을 UI·응답에 명시.
- 교육과정(2015/2022)은 `curriculum` 플래그로 분기, 데이터 없으면 graceful 처리.
