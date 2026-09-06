import { cn } from '@/lib/utils';
import { CALL_TABS } from '@/lib/clientPortal';

/**
 * Filter bar for the calls screens, shared so the client and dietitian views can never drift on
 * which buckets exist or what they're called.
 *
 * Counts sit in the tab itself rather than in a summary row above it — the number and the thing it
 * counts belong together, and it keeps the whole control one line tall on mobile.
 */
export function CallTabs({ value, onChange, groups }) {
  return (
    <div
      role="tablist"
      aria-label="Filter calls"
      className="flex flex-wrap gap-1 border-b border-line"
    >
      {CALL_TABS.map((tab) => {
        const count = groups[tab.id]?.length ?? 0;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition',
              active ? 'font-semibold text-brand-strong' : 'text-muted-foreground hover:text-forest'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                active ? 'bg-coral text-white' : 'bg-cream text-muted-foreground'
              )}
            >
              {count}
            </span>
            {/* Underline rather than a filled pill: the bar sits directly on the page, so a rule
                reads as navigation while a pill would read as a group of buttons. */}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-coral" />}
          </button>
        );
      })}
    </div>
  );
}
