import { useEffect, useState } from "react";
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
  ScrollText,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { notificationsService } from "../../services/notifications";
import { cn } from "../../utils/cn";
import type { AdminRole, NotificationKind } from "../../types/domain";

/** Which unread notification kinds count toward each item's badge. Items without an entry get no
 *  badge at all — an always-zero badge is noise, and inventing a count for the rest would be
 *  fabricating data the backend doesn't track. */
type BadgeSource = NotificationKind[];

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AdminRole[] | null;
  badge?: BadgeSource;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/admin/enquiries", label: "Enquiries", icon: Inbox, roles: null, badge: ["NEW_ENQUIRY"] },
  {
    to: "/admin/follow-ups",
    label: "Follow-ups",
    icon: CalendarClock,
    roles: null,
    badge: ["FOLLOWUP_DUE", "FOLLOWUP_OVERDUE"],
  },
  { to: "/admin/customers", label: "Customers", icon: Users, roles: null },
  { to: "/admin/applications", label: "Applications", icon: LayoutGrid, roles: null },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: null },
  { to: "/admin/users", label: "Admin Users", icon: ShieldCheck, roles: ["Super Admin", "Admin"] },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["Super Admin", "Admin"] },
  { to: "/admin/settings", label: "Settings", icon: Settings, roles: null },
];

const COLLAPSE_KEY = "zenx.sidebar.collapsed";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { profile } = useAuth();
  // Persisted so the choice survives a reload — a sidebar that springs back open every navigation
  // is worse than one that doesn't collapse at all. Reading in the initialiser (not an effect)
  // avoids a visible expand-then-collapse flash on first paint.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* private mode / blocked storage — the collapse still works, it just won't persist */
    }
  }, [collapsed]);

  // Same source the topbar bell reads, so a badge here and the bell's count can never disagree.
  const { data: notifications } = useLiveQuery(() => notificationsService.list(), [], {
    tables: ["notifications"],
  });

  const countFor = (kinds?: BadgeSource) => {
    if (!kinds || !notifications) return 0;
    return notifications.filter((n) => !n.read && kinds.includes(n.kind)).length;
  };

  const items = NAV_ITEMS.filter((item) => !item.roles || (profile && item.roles.includes(profile.role)));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-offwhite/40 backdrop-blur-[2px] lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebarBorder bg-sidebar",
          "transition-[transform,width] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "w-64 lg:w-[76px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex items-center gap-2.5 px-5 py-5", collapsed && "lg:justify-center lg:px-0")}>
          <img src="/logo-icon.png" alt="" className="h-8 w-auto shrink-0 object-contain" />
          <span className={cn("font-display text-lg tracking-wide text-white", collapsed && "lg:hidden")}>
            ZENX<span className="text-brand2">.</span>
          </span>
          <button
            className="ml-auto text-sidebarText/70 transition hover:text-white lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          {items.map((item) => {
            const count = countFor(item.badge);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150",
                    collapsed && "lg:justify-center lg:px-0",
                    isActive
                      ? "bg-lime text-white shadow-sm"
                      : "text-sidebarText hover:bg-sidebarHover hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className="shrink-0" />
                    <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[10px] font-bold",
                          isActive ? "bg-white/25 text-white" : "bg-white/10 text-sidebarText",
                          // Collapsed, a number won't fit beside a centred icon — it becomes a dot
                          // pinned to the corner, which still says "there is something here".
                          collapsed && "lg:absolute lg:right-2.5 lg:top-1.5 lg:h-2 lg:min-w-0 lg:p-0 lg:text-[0px]"
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebarBorder p-3">
          {!collapsed && (
            <div className="mb-3 rounded-lg border border-sidebarBorder bg-sidebarHover p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <LifeBuoy size={14} className="text-brand2" />
                Need a hand?
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-sidebarText/75">
                Reach the ZenX team for setup help or to report an issue.
              </p>
              <a
                href="mailto:support@zenxitsolutions.com"
                className="mt-2 inline-block text-[11px] font-semibold text-brand2 hover:underline"
              >
                Contact support
              </a>
            </div>
          )}

          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "hidden w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-sidebarText/80 transition hover:bg-sidebarHover hover:text-white lg:flex",
              collapsed && "lg:justify-center lg:px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            <span className={cn(collapsed && "lg:hidden")}>Collapse</span>
          </button>

          {!collapsed && (
            <div className="mt-2 px-3">
              <p className="text-[10px] uppercase tracking-widest text-sidebarText/55">ZenX IT Solutions</p>
              <p className="text-[11px] text-sidebarText/75">Admin Portal v1.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
