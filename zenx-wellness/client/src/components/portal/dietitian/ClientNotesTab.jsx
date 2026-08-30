import { useState } from 'react';
import { toast } from 'sonner';
import { NotebookText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useClientNotes, useCreateClientNote } from '@/hooks/useClientNotes';
import { ClientNoteCard } from './ClientNoteCard';

// Spec §6 item 6: other relevant client notes — free-standing context that isn't tied to a call
// or a report, visible to any dietitian/admin who opens this profile.
export function ClientNotesTab({ clientId }) {
  const { data, isLoading, isError, refetch } = useClientNotes(clientId);
  const createNote = useCreateClientNote();
  const [body, setBody] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    createNote.mutate(
      { client: clientId, body: body.trim() },
      {
        onSuccess: () => {
          setBody('');
          toast.success('Note added.');
        },
        onError: () => toast.error("That didn't save — please try again."),
      }
    );
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={submit} className="rounded-card bg-white p-4 shadow-soft">
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add a note</span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Anything else worth remembering about this client…"
            className="mt-1"
            rows={3}
          />
        </label>
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={createNote.isPending || !body.trim()}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {createNote.isPending ? 'Saving…' : 'Add note'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load notes"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState icon={NotebookText} title="No notes yet" description="Notes added here are visible to any dietitian or admin who opens this profile." />
      ) : (
        <div className="grid gap-3">
          {data.map((note) => (
            <ClientNoteCard key={note._id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
