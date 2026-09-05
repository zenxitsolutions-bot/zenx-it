import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { forgotPasswordRequest } from '@/api/auth.api';
import { usePublicCompany } from '@/hooks/useCompany';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

// The server always returns the same generic response whether or not the email is registered
// (auth.controller.js#forgotPassword) — this screen mirrors that by always showing the same
// success state too, so the UI never becomes a second way to probe which emails have accounts.
export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { companySlug } = useParams();
  // Branding and the back-link both follow the slug, so a user who starts at /{slug}/login stays
  // inside their company for the whole reset round-trip instead of dropping to generic Nourishly
  // pages and, at the end, to a bare /login that would refuse them.
  const { data: company } = usePublicCompany(companySlug);
  const loginPath = companySlug ? `/${companySlug}/login` : '/login';

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await forgotPasswordRequest(values);
      setSubmitted(true);
    } catch (error) {
      if (!error?.response) {
        setServerError("Can't reach the server right now. Check your connection and try again.");
      } else if (error.response.status === 429) {
        setServerError('Too many attempts. Please wait a while and try again.');
      } else {
        setServerError('Please check the highlighted fields and try again.');
      }
    }
  };

  if (submitted) {
    return (
      <AuthLayout eyebrow="CHECK YOUR EMAIL" title="Reset link sent" company={company}>
        <p className="text-sm text-muted-foreground">
          If that email is registered with Nourishly, we've sent a link to reset your password. It expires in an
          hour.
        </p>
        <Link to={loginPath} className="mt-6 inline-block text-sm font-semibold text-forest hover:underline">
          Back to log in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="FORGOT PASSWORD"
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a reset link."
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
            {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Form>

      <Link to={loginPath} className="mt-6 inline-block text-sm font-semibold text-forest hover:underline">
        Back to log in
      </Link>
    </AuthLayout>
  );
}
