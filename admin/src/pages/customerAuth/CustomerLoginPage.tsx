import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input, FieldWrap } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { isDemoMode } from "../../lib/apiClient";
import { customerAuthService, CUSTOMER_DEMO_PASSWORD } from "../../services/customerAuth";

/**
 * Public customer sign-in — distinct from /admin/login (ZenX staff). A
 * company's contact signs in once here and is routed straight into their
 * one application, or to /launcher if they have more than one.
 */
export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(isDemoMode ? "john@abcnutrition.com" : "");
  const [password, setPassword] = useState(isDemoMode ? CUSTOMER_DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await customerAuthService.signIn(email, password);
      if (user.must_change_password) {
        navigate("/change-password");
        return;
      }
      const grants = await customerAuthService.getActiveGrants(user.id);

      if (grants.length === 0) {
        setError("Your account doesn't have access to any applications yet. Contact ZenX support.");
        return;
      }
      if (grants.length === 1) {
        const url = await customerAuthService.openApplication(grants[0].application.slug, grants[0].company.id);
        window.location.href = url;
        return;
      }
      navigate("/launcher");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-xl text-offwhite">Welcome to ZenX</h2>
      <p className="mt-1 text-sm text-muted">Sign in to access your applications.</p>

      {isDemoMode && (
        <div className="mt-5 rounded-md border border-lime/30 bg-lime/5 px-3.5 py-2.5 text-xs text-lime">
          Demo mode — use a seeded customer email with password <b>{CUSTOMER_DEMO_PASSWORD}</b>, or the
          temporary password shown when a customer was created in the admin portal.
        </div>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Email" htmlFor="c-email">
          <Input
            id="c-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FieldWrap>
        <FieldWrap label="Password" htmlFor="c-password">
          <Input
            id="c-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FieldWrap>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Signing in…" : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}
