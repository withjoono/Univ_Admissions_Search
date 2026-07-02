import { createRouter, createRoute } from '@tanstack/react-router';
import { rootRoute } from './routes/root';
import { SearchPage } from '@/pages/SearchPage';
import { promoIndexRoute, promoGuideRoute, promoBlogRoute } from './routes/promo';

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: SearchPage,
});

const routeTree = rootRoute.addChildren([
  searchRoute,
  promoIndexRoute,
  promoGuideRoute,
  promoBlogRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
