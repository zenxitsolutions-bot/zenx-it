import { useEffect, useRef, useState } from "react";
import { Menu, LogOut, Search, ChevronDown, User, Settings as SettingsIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { isDemoMode } from "../../lib/apiClient";
import { cn } from "../../utils/cn";

export function Topbar({ onOpenMobile, title }: { onOpenMobile: () => void; title: string }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape as well as outside-click — a dropdown that only closes by clicking away traps
  // keyboard users on it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  /* Search routes into the enquiries list rather than opening a bespoke results overlay: that page
     already owns the search, filter and sort logic over the same records, so sending the term there
     reuses it instead of growing a second, subtly different implementation to keep in sync. */
  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate(`/admin/enquiries?q=${encodeURIComponent(q)}`);
    setTerm("");
  };

  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "?";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-panel/90 px-5 py-3 backdrop-blur lg:px-8">
      <button className="text-muted transition hover:text-offwhite lg:hidden" onClick={onOpenMobile} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h1 className="truncate font-display text-[17px] text-offwhite">{title}</h1>
        {isDemoMode && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-warnInk">
            Demo mode · seeded data
          </span>
        )}
      </div>

      <form onSubmit={runSearch} className="ml-auto hidden max-w-sm flex-1 md:block" role="search">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search enquiries…"
            aria-label="Search enquiries"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-offwhite placeholder:text-dim focus:border-lime focus:bg-panel focus:outline-none focus:ring-2 focus:ring-lime/20"
          />
        </div>
      </form>

      <div className={cn("flex items-center gap-2", "md:ml-0 ml-auto")}>
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-surface sm:pr-2"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tintBlue text-xs font-bold text-limeDim">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-semibold text-offwhite">
                {profile ? `${profile.first_name} ${profile.last_name}` : "Admin"}
              </span>
              <span className="block text-[10px] text-dim">{profile?.role}</span>
            </span>
            <ChevronDown size={14} className={cn("hidden text-dim transition sm:block", menuOpen && "rotate-180")} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] w-60 animate-popIn overflow-hidden rounded-xl2 border border-border bg-panel shadow-float"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-offwhite">
                  {profile ? `${profile.first_name} ${profile.last_name}` : "Admin"}
                </p>
                <p className="truncate text-xs text-muted">{profile?.email}</p>
                <span className="mt-1.5 inline-flex rounded-pill bg-tintBlue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-limeDim">
                  {profile?.role}
                </span>
              </div>
              <div className="p-1.5">
                <Link
                  to="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-offwhite"
                >
                  <User size={15} /> My profile
                </Link>
                <Link
                  to="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-offwhite"
                >
                  <SettingsIcon size={15} /> Settings
                </Link>
              </div>
              <div className="border-t border-border p-1.5">
                <button
                  onClick={handleSignOut}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-dangerInk transition hover:bg-tintRed"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
