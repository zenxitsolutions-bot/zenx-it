import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { resetPasswordRequest } from '@/api/auth.api';
import { usePublicCompany } from '@/hooks/useCompany';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function getResetErrorMessage(error) {
  if (!error?.response) return "Can't reach the server right now. Check your connection and try again.";
  if (error.response.status === 400) return 'This reset link is invalid or has expired — request a new one.';
  return 'Something went wrong on our end. Please try again in a moment.';
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [serverError, setServerError] = useState(null);
  // Same branding treatment as LoginPage on a slug-scoped URL — the reset link now carries the
  // user's own slug (auth.controller.js#forgotPassword), so the page they land on looks like their
  // company's, not a generic Nourishly one. Resolves to null on the bare /reset-password.
  const { data: company } = usePublicCompany(companySlug);
  // Where to send someone once they're done. The bare /login refuses every account that belongs to
  // a company, so falling back to it is only correct when there is no slug to use.
  const loginPath = companySlug ? `/${companySlug}/login` : '/login';
  const forgotPath = companySlug ? `/${companySlug}/forgot-password` : '/forgot-password';

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <AuthLayout eyebrow="RESET PASSWORD" title="Link missing or broken" company={company}>
        <p className="text-sm text-muted-foreground">
          This page needs a reset link from your email — request a new one to continue.
        </p>
        <Link to={forgotPath} className="mt-6 inline-block text-sm font-semibold text-forest hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = async ({ password }) => {
    setServerError(null);
    try {
      await resetPasswordRequest({ token, password });
      toast.success('Password updated — log in with your new password.');
      navigate(loginPath, { replace: true });
    } catch (error) {
      setServerError(getResetErrorMessage(error));
    }
  };

  return (
    <AuthLayout eyebrow="RESET PASSWORD" title="Choose a new password" subtitle="Make it something you'll remember." company={company}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="password"
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
