import { Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { isDemoMode } from "../../lib/apiClient";

export function Topbar({ onOpenMobile, title }: { onOpenMobile: () => void; title: string }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-ink/85 px-5 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button className="text-muted hover:text-offwhite lg:hidden" onClick={onOpenMobile}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-display text-lg text-offwhite">{title}</h1>
          {isDemoMode && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warn">Demo mode · seeded data</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-lime/10 text-xs font-bold text-lime">
            {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "?"}
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-offwhite">
              {profile ? `${profile.first_name} ${profile.last_name}` : "Admin"}
            </p>
            <p className="text-[10px] text-dim">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-border p-2.5 text-muted transition hover:border-danger hover:text-danger"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
