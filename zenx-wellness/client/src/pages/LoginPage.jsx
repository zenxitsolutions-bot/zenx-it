import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { usePublicCompany } from '@/hooks/useCompany';
import { getPortalHome } from '@/lib/portalHome';
import { getAuthErrorMessage } from '@/lib/authError';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  const [serverError, setServerError] = useState(null);
  // Set when the server refuses a bare /login and names the caller's own company login page
  // (auth.controller.js#login returns it in `details`), so it can be offered as a link.
  const [companyLoginPath, setCompanyLoginPath] = useState(null);
  // Only queried on a slug-scoped URL (/:companySlug/login) — the bare /login has no company to
  // brand for. Resolves to null for an unknown slug, which falls back to Nourishly's branding
  // rather than revealing whether that slug exists.
  const { data: company } = usePublicCompany(companySlug);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    setCompanyLoginPath(null);
    try {
      // The slug travels to the server, which resolves it to a company_id and refuses a
      // cross-tenant login with 403 before issuing any token (auth.controller.js#login). Comparing
      // here instead would be theatre: the credentials would already have been accepted and a
      // session minted, and anything not going through this page would be unscoped entirely.
      const user = await login({ ...values, companySlug: companySlug ?? null });
      const from = location.state?.from;
      navigate(from?.pathname ? `${from.pathname}${from.search ?? ''}` : getPortalHome(user.role, user.companySlug), {
        replace: true,
      });
    } catch (error) {
      setCompanyLoginPath(error?.response?.data?.details?.companyLoginPath ?? null);
      setServerError(getAuthErrorMessage(error, { fallback: "We couldn't log you in. Please try again." }));
    }
  };

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title={company ? `Log in to ${company.name}` : 'Log in to Nourishly'}
      subtitle="Pick up right where you left off."
      company={company}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to={companySlug ? `/${companySlug}/forgot-password` : '/forgot-password'}
                    className="text-xs font-semibold text-forest hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError && (
            <div role="alert" className="grid gap-1 text-sm text-destructive">
              <p>{serverError}</p>
              {companyLoginPath && (
                <Link to={companyLoginPath} className="font-semibold underline">
                  Go to your company's login page
                </Link>
              )}
              <p className="text-muted-foreground">
                If you were invited through ZenX, use{' '}
                <Link
                  to={companySlug ? `/${companySlug}/forgot-password` : '/forgot-password'}
                  className="font-semibold text-forest underline"
                >
                  Forgot your password
                </Link>{' '}
                or open Nourishly from your ZenX account.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-2 w-full rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {form.formState.isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
