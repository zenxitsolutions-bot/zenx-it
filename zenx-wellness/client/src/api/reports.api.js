import { axiosClient } from './axiosClient';

// params: { client? } — dietitian omits to see all their own clients' reports.
export const listReportsRequest = (params) => axiosClient.get('/reports', { params }).then((r) => r.data);

export const uploadReportRequest = ({ file, note }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (note) formData.append('note', note);
  return axiosClient.post('/reports', formData).then((r) => r.data);
};

export const addReportFeedbackRequest = (reportId, payload) =>
  axiosClient.post(`/reports/${reportId}/feedback`, payload).then((r) => r.data);

// `responseType: 'blob'` means an error body (JSON from the server's normal error handler) also
// arrives as a Blob, not parsed JSON — axios never sniffs the content-type of an error response
// against the requested responseType. Read it back out here so the viewer can show the server's
// real reason ("Report not found", "Forbidden", ...) instead of a generic message.
async function toReportFileError(err) {
  const status = err.response?.status;
  let reason =
    status === 403
      ? "You don't have permission to view this file."
      : status === 404
        ? 'The file could not be found — it may have been removed from the server.'
        : status === 401
          ? 'Your session expired — refresh the page and try again.'
          : "Something went wrong loading this file.";

  if (err.response?.data instanceof Blob) {
    try {
      const parsed = JSON.parse(await err.response.data.text());
      if (parsed?.error) reason = parsed.error;
    } catch {
      // Not a JSON body (e.g. an HTML error page from an intermediary) — keep the status-based
      // fallback above rather than surfacing raw markup.
    }
  }

  const error = new Error(reason);
  error.reason = reason;
  error.status = status;
  return error;
}

export const getReportFileRequest = (reportId) =>
  axiosClient
    .get(`/reports/${reportId}/file`, { responseType: 'blob' })
    .then((r) => ({ blob: r.data, contentType: r.headers['content-type'] }))
    .catch(async (err) => {
      throw await toReportFileError(err);
    });
