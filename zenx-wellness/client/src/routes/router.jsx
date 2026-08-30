import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ServerErrorPage } from '@/pages/ServerErrorPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { CompanySlugGuard } from './CompanySlugGuard';
import { LegacyAppRedirect } from './LegacyAppRedirect';
import { ROUTE_ROLES } from '@/lib/portalNav';

// Named-export pages need a small adapter for React.lazy, which only understands a `default`
// export — keeps every page file's existing named-export convention instead of rewriting it.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const HomePage = lazyNamed(() => import('@/pages/HomePage'), 'HomePage');
const LoginPage = lazyNamed(() => import('@/pages/LoginPage'), 'LoginPage');
const HandoffPage = lazyNamed(() => import('@/pages/HandoffPage'), 'HandoffPage');
const ForgotPasswordPage = lazyNamed(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const ChangePasswordPage = lazyNamed(() => import('@/pages/ChangePasswordPage'), 'ChangePasswordPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const UnauthorizedPage = lazyNamed(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage');

const PortalLayout = lazyNamed(() => import('@/layouts/PortalLayout'), 'PortalLayout');
const OverviewPage = lazyNamed(() => import('@/pages/app/OverviewPage'), 'OverviewPage');
const MealsPage = lazyNamed(() => import('@/pages/app/MealsPage'), 'MealsPage');
const ProgressPage = lazyNamed(() => import('@/pages/app/ProgressPage'), 'ProgressPage');
const CallsPage = lazyNamed(() => import('@/pages/app/CallsPage'), 'CallsPage');
const MessagesPage = lazyNamed(() => import('@/pages/app/MessagesPage'), 'MessagesPage');
const ReportsPage = lazyNamed(() => import('@/pages/app/ReportsPage'), 'ReportsPage');
const ClientsPage = lazyNamed(() => import('@/pages/app/ClientsPage'), 'ClientsPage');
const ClientProfilePage = lazyNamed(() => import('@/pages/app/ClientProfilePage'), 'ClientProfilePage');
const UsersPage = lazyNamed(() => import('@/pages/app/UsersPage'), 'UsersPage');
const DietitianProfilePage = lazyNamed(() => import('@/pages/app/DietitianProfilePage'), 'DietitianProfilePage');
const PlanPage = lazyNamed(() => import('@/pages/app/PlanPage'), 'PlanPage');
const PlansPage = lazyNamed(() => import('@/pages/app/PlansPage'), 'PlansPage');
const RecipesPage = lazyNamed(() => import('@/pages/app/RecipesPage'), 'RecipesPage');
const EnquiriesPage = lazyNamed(() => import('@/pages/app/EnquiriesPage'), 'EnquiriesPage');
const InsightsPage = lazyNamed(() => import('@/pages/app/InsightsPage'), 'InsightsPage');
const EmailLogPage = lazyNamed(() => import('@/pages/app/EmailLogPage'), 'EmailLogPage');
const OrganisationPage = lazyNamed(() => import('@/pages/app/OrganisationPage'), 'OrganisationPage');

// Wraps a single /app/<path> route in the RoleRoute guard for the roles that route belongs to
// (sourced from ROUTE_ROLES, which is derived from the nav config — never hand-duplicated).
function guarded(path, element) {
  return { element: <RoleRoute roles={ROUTE_ROLES[path]} />, children: [{ path, element }] };
}

export const router = createBrowserRouter([
  {
    // Applies to every descendant route — a render/loader throw anywhere in the tree lands here
    // instead of React Router's blank default error screen.
    errorElement: <ServerErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/:companySlug/login', element: <LoginPage /> },
      { path: '/:companySlug/handoff', element: <HandoffPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/:companySlug/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/:companySlug/reset-password', element: <ResetPasswordPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      // Preserves bare /app/... links/bookmarks from before company-slug URLs existed — redirects
      // to the same sub-path under the logged-in user's own slug instead of 404ing them.
      { path: '/app', element: <LegacyAppRedirect /> },
      { path: '/app/*', element: <LegacyAppRedirect /> },
      // The forced password change is an auth-flow step, not a portal screen, so it lives at the
      // top level next to /login and /reset-password rather than under /:companySlug. It has to:
      // ProtectedRoute redirects here before anything has read a slug, and `company_slug` is
      // nullable — nesting it under the slug is what made that redirect land on a /:companySlug
      // branch with no matching leaf and render a blank page.
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/change-password', element: <ChangePasswordPage /> },
          { path: '/:companySlug/change-password', element: <ChangePasswordPage /> }
        ],

      },
      {
        path: '/:companySlug',
        element: <ProtectedRoute />,
        children: [
          {
            // Keeps the URL's :companySlug in sync with the logged-in user's actual company —
            // not a security boundary itself (every controller already scopes by
            // req.user.companyId server-side), just what stops one customer from wandering onto
            // another company's URL and seeing their own data rendered under it.
            element: <CompanySlugGuard />,
            children: [
              // A bare /:companySlug otherwise matches this branch with no leaf to render, so
              // ProtectedRoute's <Outlet/> resolves to nothing and the page goes blank.
              { index: true, element: <Navigate to="app" replace /> },
              {
                path: 'app',
                children: [
                  {
                    element: <PortalLayout />,
                    children: [
                      { index: true, element: <Navigate to="overview" replace /> },
                      guarded('overview', <OverviewPage />),
                      guarded('meals', <MealsPage />),
                      guarded('progress', <ProgressPage />),
                      guarded('calls', <CallsPage />),
                      guarded('messages', <MessagesPage />),
                      guarded('reports', <ReportsPage />),
                      guarded('clients', <ClientsPage />),
                      // Not a nav entry (reached by clicking a client, not the sidebar) but guarded by the
                      // same roles as the clients list itself — see ROUTE_ROLES in portalNav.js.
                      { element: <RoleRoute roles={ROUTE_ROLES.clients} />, children: [{ path: 'clients/:id', element: <ClientProfilePage /> }] },
                      guarded('users', <UsersPage />),
                      // Not a nav entry (reached by clicking a dietitian row in Manage users) but guarded
                      // by the same roles as that list itself — see ROUTE_ROLES in portalNav.js.
                      {
                        element: <RoleRoute roles={ROUTE_ROLES.users} />,
                        children: [{ path: 'users/dietitians/:id', element: <DietitianProfilePage /> }],
                      },
                      guarded('plan', <PlanPage />),
                      guarded('plans', <PlansPage />),
                      guarded('recipes', <RecipesPage />),
                      guarded('enquiries', <EnquiriesPage />),
                      guarded('insights', <InsightsPage />),
                      guarded('email-log', <EmailLogPage />),
                      guarded('organisation', <OrganisationPage />),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  // Opts into React Router v7's upcoming defaults now to silence the deprecation warnings.
  // v7_relativeSplatPath is safe here: the only splat route (LegacyAppRedirect, '/app/*') builds
  // its redirect from location.pathname directly, not relative `to=".."`-style navigation.
  future: { v7_startTransition: true, v7_relativeSplatPath: true },
});
