# Univ_Admissions_Search (거북스쿨 입시 검색·상담 앱)

수시·정시 **전형 데이터 통합 검색** + 생기부·성적·분석결과 기반 **맞춤 AI 조언**을 제공하는 거북스쿨 위성앱. 고1~고3 전체(2015·2022 교육과정) 대상.

## 모노레포 구조
```
.
├── search-backend/    # NestJS 10 + Prisma (yarn)  — App Engine: search-backend
├── search-frontend/   # React 18 + Vite (npm)      — Firebase: search-front
└── docs/              # 기획서 및 설계 문서
```

## 문서
- [기획서](docs/기획서.md) — 전체 설계 마스터
- [데이터 연동 (multiSchema)](docs/데이터연동-multiSchema-계획.md)
- [Hub SSO 연동](docs/Hub-SSO-연동.md)
- [실행 착수 체크리스트](docs/실행착수-체크리스트.md)

## 빠른 시작
```bash
# 백엔드 (search-backend/) — 포트 4011
cd search-backend && yarn install && yarn start:dev

# 프론트엔드 (search-frontend/) — 포트 3011
cd search-frontend && npm install && npm run dev
```

## 핵심 원칙 (거북스쿨 생태계)
- **공유 DB**: 단일 Cloud SQL PostgreSQL을 스키마로 격리. 본 앱은 `search` 스키마 소유.
- **전형 데이터**: `susi`/`jungsi` 스키마를 **읽기 전용 multiSchema**로 읽어 색인.
- **사용자 프로파일**: Hub "입시 프로파일" API로 수신(직접 읽지 않음).
- **인증**: Hub SSO(JWT) — 자체 인증 없음.
- 자세한 규칙은 [CLAUDE.md](CLAUDE.md) 참조.
