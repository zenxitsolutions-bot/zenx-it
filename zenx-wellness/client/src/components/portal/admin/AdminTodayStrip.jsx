import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminTodayStrip({ today }) {
  const items = [
    { label: 'New Enquiries', value: today.newEnquiriesToday },
    { label: 'Follow-ups', value: today.followupsToday },
    { label: 'Overdue', value: today.overdueFollowups, warn: today.overdueFollowups > 0 },
    { label: 'Calls Scheduled', value: today.callsScheduledToday },
  ];

  return (
    <div className="rounded-card border border-coral/25 bg-gradient-to-r from-coral/[0.07] to-transparent p-5">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-coral uppercase">
        <Sparkles size={13} /> Today
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <span className={cn('font-display text-2xl', item.warn ? 'text-status-lost-ink' : 'text-forest')}>
              {item.value}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
