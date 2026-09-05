import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { usePublicCompany } from '@/hooks/useCompany';
import { getPortalHome } from '@/lib/portalHome';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function getChangePasswordErrorMessage(error) {
  if (!error?.response) return "Can't reach the server right now. Check your connection and try again.";
  if (error.response.status === 401) return 'Your current password is incorrect.';
  if (error.response.status === 400) return 'Please check the highlighted fields and try again.';
  return 'Something went wrong on our end. Please try again in a moment.';
}

// Reached by ProtectedRoute redirecting any /app/* path while user.mustChangePassword is true —
// not part of the portal shell, since someone forced here shouldn't see nav to screens they can't
// use yet (CLAUDE.md §3: no business logic in components — the redirect rule itself lives in
// ProtectedRoute, this page only renders the form and self-redirects once it's no longer needed).
export function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  // Branded from the *public* company endpoint rather than /company/me: this page only ever
  // renders while user.mustChangePassword is true, and company.routes.js mounts
  // blockIfMustChangePassword ahead of /me, so the authenticated lookup would 403 for exactly the
  // user looking at this screen. The slug comes from the session, not a URL param, so the branding
  // still resolves on the bare /change-password path ProtectedRoute redirects to.
  const { data: company } = usePublicCompany(user?.companySlug);

  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (user && !user.mustChangePassword) {
    return <Navigate to={getPortalHome(user.role, user.companySlug)} replace />;
  }

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setServerError(null);
    try {
      const updated = await changePassword({ currentPassword, newPassword });
      navigate(getPortalHome(updated.role, updated.companySlug), { replace: true });
    } catch (error) {
      setServerError(getChangePasswordErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      eyebrow="ONE MORE STEP"
      title="Set a new password"
      company={company}
      subtitle="Sign in used a temporary password — choose a new one before you can continue."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-2 w-full rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
