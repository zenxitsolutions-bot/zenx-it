import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDietitianOverview } from '@/hooks/useInsights';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function NotificationMenu({ sidebar = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: overview } = useDietitianOverview();
  const { data: inbox = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const attentionItems = user.role === 'dietitian' ? (overview?.attentionItems ?? []) : [];
  const unreadInbox = inbox.filter((item) => !item.readAt);
  const hasUnread = unreadInbox.length > 0 || attentionItems.length > 0;
  return (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={sidebar ? "relative flex min-h-11 w-full items-center gap-4 rounded-lg px-3 text-sm text-forest hover:bg-sidebar-hover" : "relative grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream"}
            aria-label="Notifications"
          >
            {sidebar ? <><span className="size-5 overflow-hidden" aria-hidden="true"><img src="/images/leaf-notification.png" alt="" className="size-full scale-[2] object-contain" /></span><span>Notifications</span></> : <Bell className="size-4.5" aria-hidden="true" />}
            {hasUnread && (
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-negative ring-2 ring-white" aria-hidden="true" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align={sidebar ? "start" : "end"} side={sidebar ? "top" : "bottom"} className="max-h-[60dvh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
            <DropdownMenuLabel className="flex items-center justify-between font-normal">
              <span className="text-sm font-semibold text-forest">Notifications</span>
              {unreadInbox.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-coral hover:underline"
                  onClick={() => markAllRead.mutate()}
                >
                  Mark all read
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {attentionItems.map((item) => (
              <DropdownMenuItem
                key={`attention-${item.planId ?? item.clientId}-${item.day}-${item.time}`}
                onSelect={() => navigate(`/${user.companySlug}/app/overview`)}
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-semibold text-forest">Meal swap requested</p>
                  <p className="text-xs text-muted-foreground">
                    {item.clientName ?? 'A client'} · {item.mealTitle ?? item.mealType ?? 'meal'}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            {inbox.slice(0, 12).map((item) => (
              <DropdownMenuItem
                key={item._id}
                onSelect={() => {
                  if (!item.readAt) markRead.mutate(item._id);
                  if (item.url) navigate(`/${user.companySlug}${item.url}`);
                }}
              >
                <div className="grid gap-0.5">
                  <p className={`text-sm ${item.readAt ? 'text-muted-foreground' : 'font-semibold text-forest'}`}>{item.title}</p>
                  {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
                </div>
              </DropdownMenuItem>
            ))}
            {inbox.length === 0 && attentionItems.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No new notifications yet.</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
  );
}
