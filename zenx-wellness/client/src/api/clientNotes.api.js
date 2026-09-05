import { axiosClient } from './axiosClient';

// General notes about a client (spec §6, item 6) — separate from per-call notes.
export const listClientNotesRequest = (clientId) =>
  axiosClient.get('/client-notes', { params: { client: clientId } }).then((r) => r.data);

export const createClientNoteRequest = (payload) => axiosClient.post('/client-notes', payload).then((r) => r.data);

export const updateClientNoteRequest = (noteId, payload) =>
  axiosClient.patch(`/client-notes/${noteId}`, payload).then((r) => r.data);

export const deleteClientNoteRequest = (noteId) => axiosClient.delete(`/client-notes/${noteId}`).then((r) => r.data);
