import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { TimezoneMismatchBanner } from "../components/shared/TimezoneMismatchBanner";
import { useAuth } from "../context/AuthContext";

const TITLES: [string, string][] = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/enquiries", "Enquiries"],
  ["/admin/follow-ups", "Follow-ups"],
  ["/admin/customers", "Customers"],
  ["/admin/applications", "Applications"],
  ["/admin/analytics", "Analytics"],
  ["/admin/users", "Admin Users"],
  ["/admin/audit-logs", "Audit Logs"],
  ["/admin/settings", "Settings"],
];

function titleFor(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "ZenX Admin";
}

export function AdminLayout() {
  const { profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-ink text-dim">Loading…</div>;
  }

  if (!profile) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-ink text-offwhite">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TimezoneMismatchBanner />
        <Topbar onOpenMobile={() => setMobileOpen(true)} title={titleFor(location.pathname)} />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
