import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input, FieldWrap } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset instructions.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="text-lime" size={36} />
          <h2 className="mt-4 font-display text-xl text-offwhite">Check your email</h2>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <b className="text-offwhite">{email}</b>, reset instructions are on the way.
          </p>
          <Link to="/admin/login" className="mt-6 text-xs text-lime hover:underline">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-xl text-offwhite">Forgot password</h2>
      <p className="mt-1 text-sm text-muted">We'll send reset instructions to your admin email.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FieldWrap>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset instructions"}
        </Button>
        <Link to="/admin/login" className="text-center text-xs text-muted hover:text-lime">
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
