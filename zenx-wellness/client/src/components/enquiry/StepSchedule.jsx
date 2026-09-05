import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SLOT_OPTIONS } from './enquirySchema';

export function StepSchedule({ form }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-sage-deep">ALMOST THERE</p>
      <h2 className="mt-2 mb-2 text-2xl">When suits you for a friendly call?</h2>

      <div className="mt-6 grid gap-4">
        <FormField
          control={form.control}
          name="preferredSlot"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred day</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a time" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SLOT_OPTIONS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anything you'd like us to know?</FormLabel>
              <FormControl>
                <Textarea placeholder="Share a little more about your goals (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
