import { GOAL_OPTIONS } from './enquirySchema';

export function StepGoal({ value, onSelect }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-sage-deep">LET'S START WITH YOU</p>
      <h2 className="mt-2 mb-2 text-2xl">What would you love support with?</h2>
      <p className="text-sm text-muted-foreground">Choose the goal that feels closest. You can tell us more later.</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {GOAL_OPTIONS.map(({ value: goal, icon: Icon }) => (
          <button
            key={goal}
            type="button"
            onClick={() => onSelect(goal)}
            aria-pressed={value === goal}
            className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold text-forest transition-colors ${
              value === goal ? 'border-sage-deep bg-sage/40' : 'border-line bg-white hover:border-sage-deep'
            }`}
          >
            <Icon className="size-4 shrink-0 text-sage-deep" aria-hidden="true" />
            {goal}
          </button>
        ))}
      </div>
    </div>
  );
}
