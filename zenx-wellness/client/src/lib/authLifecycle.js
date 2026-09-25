export function accountIdentity(user) {
  return user ? `${user.companyId ?? ''}:${user._id ?? user.id ?? ''}` : null;
}

// Clear immediately, even if request cancellation takes time or a fetch ignores its signal.
export function clearPrivateCache(queryClient) {
  try { Promise.resolve(queryClient.cancelQueries()).catch(() => {}); } catch { /* clearing still runs */ }
  queryClient.clear();
}
