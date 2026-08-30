import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listClientNotesRequest,
  createClientNoteRequest,
  updateClientNoteRequest,
  deleteClientNoteRequest,
} from '../api/clientNotes.api';

export function useClientNotes(clientId) {
  return useQuery({
    queryKey: ['client-notes', clientId],
    queryFn: () => listClientNotesRequest(clientId),
    enabled: Boolean(clientId),
  });
}

export function useCreateClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClientNoteRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notes'] }),
  });
}

export function useUpdateClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...payload }) => updateClientNoteRequest(noteId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notes'] }),
  });
}

export function useDeleteClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClientNoteRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notes'] }),
  });
}
