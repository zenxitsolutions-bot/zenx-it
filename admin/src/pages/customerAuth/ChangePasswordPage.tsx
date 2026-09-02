import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input, FieldWrap } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { customerAuthService } from "../../services/customerAuth";
import type { ZenxUser } from "../../types/domain";

/**
 * Forced stop between login and the launcher whenever a person is still on a
 * temporary password (an admin set it at creation or via Reset Password).
 * Skipped entirely once they've chosen their own password.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ZenxUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerAuthService.getCurrentUser().then((u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      if (!u.must_change_password) {
        navigate("/launcher", { replace: true });
        return;
      }
      setUser(u);
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await customerAuthService.setNewPassword(user.id, password);
      const grants = await customerAuthService.getActiveGrants(user.id);
      if (grants.length === 1) {
        const url = await customerAuthService.openApplication(grants[0].application.slug);
        window.location.href = url;
        return;
      }
      navigate("/launcher", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AuthLayout>
      <h2 className="font-display text-xl text-offwhite">Choose a new password</h2>
      <p className="mt-1 text-sm text-muted">
        You're signing in with a temporary password. Set your own before continuing.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="New password" htmlFor="new-password" hint="At least 8 characters">
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FieldWrap>
        <FieldWrap label="Confirm password" htmlFor="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Saving…" : "Set password & continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
