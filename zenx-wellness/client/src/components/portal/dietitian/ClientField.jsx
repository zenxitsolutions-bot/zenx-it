import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// The "Client" picker in DietitianCallFormDialog's booking form (not shown when rescheduling).
export function ClientField({ control, clients }) {
  return (
    <FormField
      control={control}
      name="client"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Client</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(clients ?? []).map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
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
