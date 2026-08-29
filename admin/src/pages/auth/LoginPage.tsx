import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input, FieldWrap } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { isDemoMode } from "../../lib/apiClient";
import { DEMO_PASSWORD } from "../../services/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(isDemoMode ? "aria@zenxitsolutions.com" : "");
  const [password, setPassword] = useState(isDemoMode ? DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-xl text-offwhite">Admin sign in</h2>
      <p className="mt-1 text-sm text-muted">Sign in to manage enquiries, follow-ups and customers.</p>

      {isDemoMode && (
        <div className="mt-5 rounded-md border border-lime/30 bg-lime/5 px-3.5 py-2.5 text-xs text-lime">
          Demo mode — use any seeded admin email with password <b>{DEMO_PASSWORD}</b>
        </div>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FieldWrap>
        <FieldWrap label="Password" htmlFor="password">
          <Input
            id="password"
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

        <Link to="/admin/forgot-password" className="text-center text-xs text-muted hover:text-lime">
          Forgot password?
        </Link>
      </form>
    </AuthLayout>
  );
}
