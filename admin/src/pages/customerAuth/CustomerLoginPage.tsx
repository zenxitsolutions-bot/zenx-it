import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input, FieldWrap } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { isDemoMode } from "../../lib/apiClient";
import { customerAuthService, CUSTOMER_DEMO_PASSWORD } from "../../services/customerAuth";

/**
 * Tenant-scoped customer sign-in at /:companySlug/login. Distinct from /admin/login (ZenX staff).
 * Bare /login is a pointer to this page — credentials are only accepted with a company slug.
 */
export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [email, setEmail] = useState(isDemoMode ? "john@abcnutrition.com" : "");
  const [password, setPassword] = useState(isDemoMode ? CUSTOMER_DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [companyLoginPath, setCompanyLoginPath] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companySlug) return;
    customerAuthService.getPublicCompany(companySlug).then((company) => {
      setCompanyName(company?.name ?? null);
    });
  }, [companySlug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCompanyLoginPath(null);
    setLoading(true);
    try {
      const user = await customerAuthService.signIn(email, password, companySlug ?? null);
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
        const url = await customerAuthService.openApplication(grants[0].application.slug);
        window.location.href = url;
        return;
      }
      navigate("/launcher");
    } catch (err) {
      const details = err && typeof err === "object" && "companyLoginPath" in err
        ? (err as { companyLoginPath?: string | null }).companyLoginPath
        : null;
      if (details) setCompanyLoginPath(details);
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-xl text-offwhite">
        {companyName ? `Welcome to ${companyName}` : "Welcome to ZenX"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {companySlug
          ? "Sign in to access your applications."
          : "Use the company login URL your ZenX admin gave you, for example /fitlife/login."}
      </p>

      {isDemoMode && companySlug && (
        <div className="mt-5 rounded-md border border-lime/30 bg-lime/5 px-3.5 py-2.5 text-xs text-lime">
          Demo mode — try <b>/abc-nutrition/login</b> with <b>john@abcnutrition.com</b> /{" "}
          <b>{CUSTOMER_DEMO_PASSWORD}</b>.
        </div>
      )}

      {!companySlug ? (
        <p className="mt-6 text-sm text-muted">
          There is no shared login. Each company has its own URL.
        </p>
      ) : (
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
            <div className="flex flex-col gap-1 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
              {companyLoginPath && (
                <Link to={companyLoginPath} className="font-semibold underline">
                  Go to your company's login page
                </Link>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Signing in…" : "Login"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
