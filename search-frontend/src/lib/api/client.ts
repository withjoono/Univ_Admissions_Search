import axios from 'axios';
import { camelizeKeys, decamelizeKeys } from 'humps';

/** 인증 불필요 클라이언트. 응답 success 래핑을 풀고 snake_case↔camelCase 변환. */
// dev: vite proxy(/api → localhost:4011). prod: search-backend는 별도 App Engine 서비스라
// Firebase Hosting rewrite로 프록시 불가 — 절대 URL로 직접 호출.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://search-backend-dot-ts-back-nest-479305.du.r.appspot.com/api');
export const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 12000 });

publicClient.interceptors.request.use((config) => {
  if (config.params) config.params = decamelizeKeys(config.params);
  return config;
});

publicClient.interceptors.response.use((res) => {
  const body = res.data;
  // 백엔드 공통 포맷: { success, data }
  const payload = body && typeof body === 'object' && 'data' in body ? body.data : body;
  res.data = camelizeKeys(payload);
  return res;
});

// TODO(Phase 4): authClient — Hub JWT 자동첨부 + 401 refresh
