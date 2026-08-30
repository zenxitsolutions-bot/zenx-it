import { cn } from '@/lib/utils';

export function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <div className={cn('rounded-xl p-4', tone === 'sage' ? 'bg-sage/50' : 'bg-cream')}>
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <strong className="mt-1 block text-xl text-forest">{value}</strong>
      {hint && <small className="text-xs text-sage-deep">{hint}</small>}
    </div>
  );
}
