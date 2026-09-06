import { useState } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateClientNote, useDeleteClientNote } from '@/hooks/useClientNotes';
import { formatDateTime } from '@/lib/format';

export function ClientNoteCard({ note }) {
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || note.author === user._id;
  const updateNote = useUpdateClientNote();
  const deleteNote = useDeleteClientNote();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);

  function save() {
    updateNote.mutate(
      { noteId: note._id, body },
      {
        onSuccess: () => {
          toast.success('Note updated.');
          setEditing(false);
        },
        onError: () => toast.error("That didn't save — please try again."),
      }
    );
  }

  function remove() {
    deleteNote.mutate(note._id, {
      onSuccess: () => toast.success('Note deleted.'),
      onError: () => toast.error("That didn't delete — please try again."),
    });
  }

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm text-forest">{note.authorName}</strong>
        <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
      </div>

      {editing ? (
        <div className="mt-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setBody(note.body); }} className="text-sm text-muted-foreground hover:underline">
              Cancel
            </button>
            <Button size="sm" onClick={save} disabled={updateNote.isPending || !body.trim()} className="rounded-full bg-coral text-white hover:bg-coral/90">
              {updateNote.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm whitespace-pre-wrap text-forest">{note.body}</p>
          {canEdit && (
            <div className="mt-2 flex gap-4">
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-forest hover:underline">
                Edit
              </button>
              <button type="button" onClick={remove} className="text-xs font-semibold text-destructive hover:underline">
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
