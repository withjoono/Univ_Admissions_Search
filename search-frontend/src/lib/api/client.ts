import axios from 'axios';
import { camelizeKeys, decamelizeKeys } from 'humps';

/** 인증 불필요 클라이언트. 응답 success 래핑을 풀고 snake_case↔camelCase 변환. */
export const publicClient = axios.create({ baseURL: '/api' });

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
