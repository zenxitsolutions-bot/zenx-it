import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateProgress } from '@/hooks/useProgress';

const measurementField = z.union([z.coerce.number().positive('Enter a valid measurement'), z.literal('')]).optional();

const schema = z.object({
  date: z.string().min(1),
  weight: z.coerce.number().positive('Enter a valid weight'),
  waist: measurementField,
  hip: measurementField,
  thigh: measurementField,
  upperArm: measurementField,
  energy: z.union([z.coerce.number().min(0).max(10), z.literal('')]).optional(),
  adherence: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
});

const today = () => new Date().toISOString().slice(0, 10);
const emptyValues = { date: today(), weight: '', waist: '', hip: '', thigh: '', upperArm: '', energy: '', adherence: '' };

export function ProgressEntryDialog({ open, onOpenChange }) {
  const createProgress = useCreateProgress();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  function handleOpenChange(next) {
    onOpenChange(next);
    if (!next) form.reset(emptyValues);
  }

  function onSubmit(values) {
    createProgress.mutate(
      {
        date: values.date,
        weight: values.weight,
        waist: values.waist === '' ? undefined : values.waist,
        hip: values.hip === '' ? undefined : values.hip,
        thigh: values.thigh === '' ? undefined : values.thigh,
        upperArm: values.upperArm === '' ? undefined : values.upperArm,
        energy: values.energy === '' ? undefined : values.energy,
        adherence: values.adherence === '' ? undefined : values.adherence,
      },
      {
        onSuccess: () => {
          toast.success('Progress logged — nice work!');
          handleOpenChange(false);
        },
        onError: () => toast.error("We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update today's progress</DialogTitle>
          <DialogDescription>Every update tells a story of care and consistency.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g. 67.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="waist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waist (cm, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hip (cm, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 98" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thigh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thigh (cm, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 56" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upperArm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upper arm (cm, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="energy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy score (0–10, optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adherence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adherence % (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={createProgress.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {createProgress.isPending ? 'Saving…' : 'Save progress'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
