import { Phone, Mail, MessageCircle, Users, Video, MoreHorizontal } from "lucide-react";
import type { Interaction, Profile } from "../../types/domain";
import { EmptyState } from "../ui/EmptyState";
import { formatDate, formatTime } from "../../utils/date";

const ICONS: Record<Interaction["contact_type"], typeof Phone> = {
  "Phone Call": Phone,
  Email: Mail,
  WhatsApp: MessageCircle,
  Meeting: Users,
  "Video Call": Video,
  Other: MoreHorizontal,
};

export function ConversationTimeline({
  interactions,
  admins,
}: {
  interactions: Interaction[];
  admins: Profile[];
}) {
  const adminById = new Map(admins.map((a) => [a.id, a]));

  if (interactions.length === 0) {
    return <EmptyState title="No conversations yet" description="Log the first call or message with Add Interaction." />;
  }

  return (
    <div className="flex flex-col">
      {interactions.map((i, idx) => {
        const Icon = ICONS[i.contact_type];
        const admin = adminById.get(i.admin_id);
        return (
          <div key={i.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-panel text-lime">
                <Icon size={14} />
              </span>
              {idx < interactions.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-dim">
                <span className="font-semibold text-offwhite">{formatDate(i.created_at)}</span>
                <span>{formatTime(i.created_at)}</span>
                <span>·</span>
                <span>{i.contact_type}</span>
                {admin && (
                  <>
                    <span>·</span>
                    <span>{admin.first_name} {admin.last_name}</span>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-sm text-offwhite">{i.comment}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {i.outcome}
                </span>
                {i.next_action && (
                  <span className="text-xs text-muted">
                    Next action: <span className="text-offwhite">{i.next_action}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
