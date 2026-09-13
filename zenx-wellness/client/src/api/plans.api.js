import { axiosClient } from './axiosClient';

// params: { client?, week? } — omitted for "my own plans" (client role, server auto-scopes).
export const listPlansRequest = (params) => axiosClient.get('/plans', { params }).then((r) => r.data);

export const createPlanRequest = (payload) => axiosClient.post('/plans', payload).then((r) => r.data);

export const updatePlanRequest = (planId, payload) => axiosClient.patch(`/plans/${planId}`, payload).then((r) => r.data);

export const deletePlanRequest = (planId) => axiosClient.delete(`/plans/${planId}`);

export const updateMealStatusRequest = (planId, mealIndex, payload) =>
  axiosClient.patch(`/plans/${planId}/meals/${mealIndex}`, payload).then((r) => r.data);

function filenameFromDisposition(header) {
  if (!header) return null;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  return quoted?.[1] ?? null;
}

async function toPdfError(err) {
  const status = err.response?.status;
  let reason =
    status === 403
      ? "You don't have permission to download this plan."
      : status === 404
        ? 'That weekly plan could not be found.'
        : status === 401
          ? 'Your session expired — refresh the page and try again.'
          : "We couldn't download the plan PDF.";

  if (err.response?.data instanceof Blob) {
    try {
      const parsed = JSON.parse(await err.response.data.text());
      if (parsed?.error) reason = parsed.error;
    } catch {
      // Keep the status-based fallback rather than surfacing raw markup.
    }
  }

  const error = new Error(reason);
  error.status = status;
  return error;
}

export const downloadPlanPdfRequest = async (planId) => {
  try {
    const response = await axiosClient.get(`/plans/${planId}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromDisposition(response.headers['content-disposition']) || 'weekly-plan.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw await toPdfError(err);
  }
};
