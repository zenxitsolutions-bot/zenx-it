import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProgramPlan, useUpdateProgramPlan } from '@/hooks/useProgramPlans';

const schema = z.object({
  name: z.string().min(1, 'Enter a name'),
  description: z.string().optional(),
  active: z.enum(['true', 'false']),
});

function toFormValues(plan) {
  if (!plan) return { name: '', description: '', active: 'true' };
  return { name: plan.name, description: plan.description ?? '', active: plan.active ? 'true' : 'false' };
}

// plan: null (create) | a plan object (edit)
export function ProgramPlanFormDialog({ open, onOpenChange, plan }) {
  const isEdit = Boolean(plan);
  const createPlan = useCreateProgramPlan();
  const updatePlan = useUpdateProgramPlan();
  const isSaving = createPlan.isPending || updatePlan.isPending;

  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(plan) });

  useEffect(() => {
    if (open) form.reset(toFormValues(plan));
  }, [open, plan, form]);

  function onSubmit(values) {
    const payload = { name: values.name, description: values.description || undefined };
    const mutation = isEdit ? updatePlan : createPlan;
    const mutateArgs = isEdit ? { planId: plan._id, ...payload, active: values.active === 'true' } : payload;

    mutation.mutate(mutateArgs, {
      onSuccess: () => {
        toast.success(isEdit ? 'Plan updated.' : 'Plan created.');
        onOpenChange(false);
      },
      onError: () => toast.error("We couldn't save that — please try again."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit plan' : 'Create a plan'}</DialogTitle>
          <DialogDescription>Available to every dietitian for their clients.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Weight Loss" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" disabled={isSaving} className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90">
              {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
