import { createRootRoute, Outlet } from '@tanstack/react-router';

/** 검색 화면은 기존과 동일하게 보이도록 루트는 Outlet만 렌더 */
export const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
