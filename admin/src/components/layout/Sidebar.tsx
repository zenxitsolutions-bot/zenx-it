import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  CalendarClock,
  Users,
  LayoutGrid,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import type { AdminRole } from "../../types/domain";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AdminRole[] | null;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/admin/enquiries", label: "Enquiries", icon: Inbox, roles: null },
  { to: "/admin/follow-ups", label: "Follow-ups", icon: CalendarClock, roles: null },
  { to: "/admin/customers", label: "Customers", icon: Users, roles: null },
  { to: "/admin/applications", label: "Applications", icon: LayoutGrid, roles: null },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: null },
  { to: "/admin/users", label: "Admin Users", icon: ShieldCheck, roles: ["Super Admin", "Admin"] },
  { to: "/admin/settings", label: "Settings", icon: Settings, roles: null },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { profile } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.roles || (profile && item.roles.includes(profile.role)));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-panel transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="h-8 w-auto object-contain" />
            <span className="font-display text-lg tracking-wide text-offwhite">
              ZENX<span className="text-lime">.</span>
            </span>
          </div>
          <button className="text-dim hover:text-offwhite lg:hidden" onClick={onCloseMobile}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-lime/10 text-lime"
                    : "text-muted hover:bg-white/5 hover:text-offwhite"
                )
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-dim">ZenX IT Solutions</p>
          <p className="text-xs text-muted">Admin Portal v1.0</p>
        </div>
      </aside>
    </>
  );
}
