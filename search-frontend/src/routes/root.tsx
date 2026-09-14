import { Footer } from "../components/footer";
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppHeader } from '../components/app-header';

export const rootRoute = createRootRoute({
  component: () => <><AppHeader /><Outlet /><Footer /></>,
});
