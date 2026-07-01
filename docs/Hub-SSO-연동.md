# Hub SSO 연동 가이드 (검색앱)

> **출처**: `withjoono/Hub` CLAUDE.md(생태계 SSOT) + `jungsi-backend` Prisma introspection의 `hub` 스키마 모델(실측, 2026-06-29).
> **상위 문서**: [`기획서.md`](./기획서.md)

검색앱은 별도 인증을 만들지 않는다. **Hub가 발급한 JWT를 검증**해 사용자를 식별하고, 다른 위성앱(Susi/ExamHub)과 동일한 패턴을 따른다.

---

## 1. 실측 hub 스키마 (인증 관련)

| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `hub.auth_member` | 사용자 | `id`(VarChar30, PK), `email`, `role_type`, `member_type`(student/teacher/parent), `provider_type`/`oauth_id`(소셜), `firebase_uid`, `account_stop_yn` |
| `hub.oauth_clients` | OAuth2 클라이언트 | `clientId`(unique), `clientSecret`, `redirectUris[]`, `allowedScopes[]`, `isActive` |
| `hub.oauth_authorization_codes` | 인가코드 | `code`(unique), `clientId`, `memberId`, `redirectUri`, `scope[]`, `codeChallenge`/`codeChallengeMethod`(PKCE), `expiresAt`, `isUsed` |
| `hub.hub_apps` | 위성앱 카탈로그 | `id`, `name`, `app_url`, `is_active` |
| `hub.hub_product_permission_mappings` | 앱별 상품→권한 매핑 | `app_id`, `external_product_id`, `plan`, `features` |

→ Hub는 **OAuth2 Authorization Code + PKCE**(oauth_clients/codes)와 **위성앱 토큰교환(sso_code)** 두 방식을 모두 지원한다.

## 2. JWT 스펙 (모든 앱 공통, 절대 변경 금지)
- 알고리즘 **HS512**, secret은 **Base64 인코딩**(`Buffer.from(secret,'base64')`로 디코드해 사용)
- Access token 2h (`sub:'ATK'`), Refresh token 60d (`sub:'RTK'`)
- 저장: 브라우저 `localStorage` (`accessToken`, `refreshToken`)
- `AUTH_JWT_SECRET` 변경 시 **전 생태계 세션 즉시 무효화** → 검색앱은 같은 secret을 env로 주입만 하고 절대 바꾸지 않는다.

---

## 3. 권장 연동 방식 A — 위성앱 토큰교환 (Susi/ExamHub와 동일, 권장)

가장 빠르고 생태계 일관성 높음. 흐름:
```
1. 검색앱 → Hub 로그인으로 이동:  https://www.tskool.kr/login?redirect=<검색앱-URL>
2. Hub: 로그인 성공 → 단기 sso_code 생성(Redis, 5분 TTL) → 검색앱으로 redirect (?sso_code=...)
3. 검색앱 프론트: sso_code를 자기 백엔드로 전달  → POST /auth/sso/exchange { code }
4. 검색앱 백엔드 → Hub 백엔드 server-to-server:  POST /auth/sso/verify-code { code, serviceId }
5. Hub → JWT(access/refresh) 반환 → 검색앱 백엔드 → 프론트 → localStorage 저장
```
구현 포인트:
- **SSO 캡처 로직은 루트 레이아웃**(`__root.tsx`)에서 실행(딥링크로 진입해도 sso_code를 놓치지 않도록).
- Hub Frontend에 검색앱용 `VITE_<APP>_URL` env가 등록돼야 Hub가 sso_code를 생성함 → **Hub 측 등록 1회 필요**.
- `?redirect=` / `?redirect_uri=` 둘 다 지원.
- Redis 다운 시 SSO가 조용히 실패 → 모니터링 필요.

## 4. 대안 방식 B — OAuth2 Authorization Code + PKCE (표준)

표준 OAuth2로 가려면 `hub.oauth_clients`에 검색앱을 등록(`clientId`, `redirectUris`, `allowedScopes`)하고 PKCE(code_challenge) 인가코드 흐름 사용. 향후 OAuth2 표준화 시 채택. 기능은 이미 Hub에 구현돼 있음(oauth_authorization_codes의 PKCE 컬럼).

> **선택 권장**: 1차는 **방식 A**(다른 위성앱과 동일, 신규 작업 최소). OAuth2 마이그레이션 계획이 있으면 방식 B.

---

## 5. 검색앱 백엔드의 토큰 검증
- env: `AUTH_JWT_SECRET`(Base64) 주입 → `Buffer.from(secret,'base64')` 로 HS512 검증.
- NestJS `JwtAuthGuard`로 보호 라우트 처리. 토큰의 `memberId` → 사용자 식별(필요 시 `hub.auth_member`를 읽기전용 multiSchema로 조회해 role/member_type 확인).
- 에러코드 컨벤션: `C401`(만료→리프레시), `C999`(무효), `C5050`(세션만료), `C403`(권한없음).
- 프론트: axios 인터셉터로 JWT 자동첨부 + 401 시 refresh, snake_case↔camelCase 변환(humps).

## 6. 서비스 간 호출(필요 시)
사용자 토큰이 아닌 서버-서버 호출(예: 권한/구독 확인)은 **`AUTH_SERVICE_SECRET`**(HS512, Base64; `AUTH_JWT_SECRET`과 별개) 서비스 토큰 + 헤더 `Authorization: Bearer <token>`, `X-Service-Id: search` 로 Hub의 `/api/internal/*` 호출. 토큰 발급은 Hub-Backend의 `scripts/issue-service-token.ts`.

---

## 7. 검색앱 SSO 셋업 체크리스트
- [ ] Hub 측: `hub_apps`에 검색앱 등록 + Hub Frontend에 `VITE_SEARCH_URL` env 추가(방식 A) **또는** `oauth_clients`에 등록(방식 B)
- [ ] 검색앱 env: `AUTH_JWT_SECRET`(Base64, 기존 값 그대로) 주입
- [ ] 프론트 루트 레이아웃에 sso_code 캡처 → `/auth/sso/exchange`
- [ ] 백엔드 `/auth/sso/exchange` → Hub `/auth/sso/verify-code` 프록시 + JWT 검증 가드
- [ ] (필요 시) 서비스 토큰 발급받아 `/api/internal/*` 호출
