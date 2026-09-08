import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const ALL = 'all';

export function CallListFilters({
  personLabel,
  allLabel,
  personValue,
  onPersonChange,
  people,
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
}) {
  const everyone = allLabel ?? `All ${personLabel.toLowerCase()}s`;
  const hasFilters = Boolean(personValue || from || to);

  return (
    <div className="mb-4 grid gap-3 min-[640px]:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))_auto] min-[640px]:items-end">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="call-filter-person">
          {personLabel}
        </label>
        <Select value={personValue || ALL} onValueChange={(value) => onPersonChange(value === ALL ? '' : value)}>
          <SelectTrigger id="call-filter-person" className="w-full bg-white">
            <SelectValue placeholder={everyone} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{everyone}</SelectItem>
            {(people ?? []).map((person) => (
              <SelectItem key={person._id} value={person._id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="call-filter-from">
          From
        </label>
        <Input id="call-filter-from" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="bg-white" />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="call-filter-to">
          To
        </label>
        <Input id="call-filter-to" type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="bg-white" />
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={!hasFilters}
        className="h-10 text-sm font-semibold text-forest hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
      >
        Clear
      </button>
    </div>
  );
}
