import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALL_REMINDER_OPTIONS } from '@/lib/callScheduling';

// The "Remind me" field shared by CallFormDialog (client) and DietitianCallFormDialog — only shown
// when booking a new call, not when rescheduling an existing one.
export function CallReminderField({ control }) {
  return (
    <FormField
      control={control}
      name="reminderMinutesBefore"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Remind me</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {CALL_REMINDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
