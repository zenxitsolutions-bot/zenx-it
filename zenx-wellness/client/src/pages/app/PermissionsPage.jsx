import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosClient } from '@/api/axiosClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDefaultPermissions, getEffectivePermissions, hasPermission, isMainAdmin, permissionEditorLocked, permissionDraftAfterToggle } from '@/lib/permissions';

export function PermissionsPage() {
  const { user: viewer } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState({});
  const directory = useQuery({ queryKey: ['permissions'], queryFn: () => axiosClient.get('/permissions').then((r) => r.data) });
  const users = directory.data?.users ?? [];
  const target = users.find((entry) => entry._id === selectedId);
  const definitions = directory.data?.definitions ?? [];
  const locked = permissionEditorLocked(viewer, target);
  const baseline = target ? getEffectivePermissions(target) : {};
  const changed = definitions.some(({ key }) => Boolean(draft[key]) !== Boolean(baseline[key]));
  const save = useMutation({
    mutationFn: () => axiosClient.put(`/permissions/${target._id}`, { permissions: draft }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Permissions saved. This team member must sign in again.');
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Could not save permissions. Please try again.'),
  });
  useEffect(() => {
    if (target) setDraft(getEffectivePermissions(target));
  }, [target]);

  function mayChange(definition) {
    if (locked || !definition.roles.includes(target.role)) return false;
    if (definition.key === 'permissions.manage') return isMainAdmin(viewer);
    return isMainAdmin(viewer) || hasPermission(viewer, definition.key);
  }
  function toggle(definition, enabled) {
    const next = permissionDraftAfterToggle(draft, definition.key, enabled, definitions);
    if (definitions.some((item) => next[item.key] !== draft[item.key] && !mayChange(item))) {
      toast.error('This change also needs a permission that only your main admin can adjust.');
      return;
    }
    setDraft(next);
  }
  const groups = [...new Set(definitions.filter((entry) => target && entry.roles.includes(target.role)).map((entry) => entry.group))];
  const defaults = target ? getDefaultPermissions(target.role) : {};
  const mayRestore = !locked && definitions.every((definition) =>
    Boolean(defaults[definition.key]) === Boolean(baseline[definition.key]) || mayChange(definition));

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-9">
      <h1 className="text-3xl text-forest">Team permissions</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">Choose what each admin and dietitian can view or change. The main admin always keeps full access. Existing staff keep their current role permissions until you save changes. Saving signs the selected team member out of their current sessions.</p>
      {directory.isLoading ? <Skeleton className="mt-6 h-64 w-full" /> : directory.isError ? (
        <div className="mt-6 rounded-card bg-white p-6"><p>Could not load team permissions.</p><Button className="mt-3" onClick={() => directory.refetch()}>Try again</Button></div>
      ) : directory.data?.configured === false ? (
        <div role="status" className="mt-6 rounded-card border border-amber-300 bg-amber-50 p-6">
          <h2 className="text-xl">Main admin setup required</h2>
          <p className="mt-2">An operator must explicitly select this company's main admin before permission changes are enabled. No existing admin is automatically promoted. Your current access stays unchanged until setup is complete.</p>
        </div>
      ) : (
        <>
          <label className="mt-6 grid max-w-lg gap-2 font-semibold" htmlFor="permission-user">Team member
            <select id="permission-user" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={save.isPending} className="rounded-xl border border-line bg-white p-3 font-normal">
              <option value="">Select an admin or dietitian</option>
              {users.map((entry) => <option value={entry._id} key={entry._id}>{entry.name} — {entry.isMainAdmin ? 'Main admin' : entry.role === 'admin' ? 'Admin' : 'Dietitian'}</option>)}
            </select>
          </label>
          {target && <div className="mt-5 space-y-5">
            {locked && <p role="status" className="rounded-xl bg-sage/40 p-4">{target.isMainAdmin ? 'The main admin has every permission and cannot be restricted.' : 'Only the main admin can change your permissions or another permission manager’s access.'}</p>}
            {!isMainAdmin(viewer) && <p className="text-sm text-muted-foreground">You can assign only permissions you already have. Only the main admin can delegate permission management.</p>}
            {groups.map((group) => <fieldset key={group} className="rounded-card border border-line bg-white p-5">
              <legend className="px-2 font-semibold text-forest">{group}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {definitions.filter((definition) => definition.group === group && definition.roles.includes(target.role)).map((definition) => <label key={definition.key} className="flex items-start gap-3">
                  <input type="checkbox" checked={Boolean(draft[definition.key])} disabled={save.isPending || !mayChange(definition)} onChange={(event) => toggle(definition, event.target.checked)} className="mt-1 size-4 accent-forest" />
                  <span><span className="block font-semibold">{definition.label}</span><span className="block text-sm text-muted-foreground">{definition.description}</span></span>
                </label>)}
              </div>
            </fieldset>)}
            {!locked && <div className="sticky bottom-16 flex flex-wrap justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-soft min-[1050px]:bottom-4">
              <Button variant="outline" disabled={!mayRestore || save.isPending} onClick={() => setDraft(defaults)}>Restore role defaults</Button>
              <Button disabled={!changed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save permissions'}</Button>
            </div>}
          </div>}
        </>
      )}
    </div>
  );
}
