import getRouterBasename from '@/lib/router';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import AuthCallback from 'pages/AuthCallback';
import Element from 'pages/Element';
import Env from 'pages/Env';
import Home from 'pages/Home';
import Login from 'pages/Login';
import Thread from 'pages/Thread';

// Derive the router's type from the function that creates it.
// This gives TypeScript a nameable type without importing from the
// transitive `@remix-run/router` package, which pnpm does not expose
// to this workspace package.
type AppRouter = ReturnType<typeof createBrowserRouter>;

export const router: AppRouter = createBrowserRouter(
  [
    {
      path: '/',
      element: <Home />
    },
    {
      path: '/env',
      element: <Env />
    },
    {
      path: '/thread/:id?',
      element: <Thread />
    },
    {
      path: '/element/:id',
      element: <Element />
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/login/callback',
      element: <AuthCallback />
    },
    {
      path: '/share/:id',
      element: <Thread />
    },
    {
      path: '*',
      element: <Navigate replace to="/" />
    }
  ],
  { basename: getRouterBasename() }
);
