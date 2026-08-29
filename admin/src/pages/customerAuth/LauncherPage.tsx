import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { customerAuthService, type ActiveGrant } from "../../services/customerAuth";
import type { ZenxUser } from "../../types/domain";

/**
 * Shown after login when a person has ACTIVE access to more than one ZenX
 * application (or the same application across more than one company). Only
 * ACTIVE grants ever appear here.
 */
export default function LauncherPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ZenxUser | null>(null);
  const [grants, setGrants] = useState<ActiveGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingGrantId, setOpeningGrantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerAuthService.getCurrentUser().then(async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      if (u.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }
      setUser(u);
      setGrants(await customerAuthService.getActiveGrants(u.id));
      setLoading(false);
    });
  }, [navigate]);

  const handleOpen = async (grant: ActiveGrant) => {
    setError(null);
    setOpeningGrantId(grant.grant.id);
    try {
      const url = await customerAuthService.openApplication(grant.application.slug, grant.company.id);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that application.");
      setOpeningGrantId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-muted">
        Loading your applications…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl text-offwhite">
          Welcome, <span className="text-lime">{user?.first_name}</span>.
        </h1>
        <p className="mt-1 text-sm text-muted">Your Applications</p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {grants.length === 0 && (
            <Card className="p-6 text-sm text-muted">
              Your account doesn't have access to any applications yet. Contact ZenX support.
            </Card>
          )}
          {grants.map((grant) => (
            <Card key={grant.grant.id} className="flex items-center justify-between gap-4 p-6">
              <div>
                <h3 className="font-display text-lg text-offwhite">{grant.application.name}</h3>
                <p className="mt-1 text-sm text-muted">{grant.company.company_name}</p>
              </div>
              <Button onClick={() => handleOpen(grant)} disabled={openingGrantId === grant.grant.id}>
                {openingGrantId === grant.grant.id ? "Opening…" : "Open Application"}
                <ArrowRight size={14} />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
