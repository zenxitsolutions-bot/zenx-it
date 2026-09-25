// SQL/provider Error objects may carry connection URLs, bound parameters or email bodies.
export function safeErrorMeta(error) {
  const code = typeof error?.code === 'string' && /^(?:ER_|ERR_)[A-Z0-9_]{1,60}$|^E[A-Z]{2,16}$/.test(error.code) ? error.code : 'INTERNAL_ERROR';
  return { code };
}
