/** One input treatment across every auth form, error state included. */
export const inputClass = (hasError) =>
  [
    'w-full rounded-xl border bg-white px-4 py-3 text-[0.95rem] text-slate-900 shadow-sm',
    'placeholder:text-slate-400 transition duration-150 outline-none',
    'focus:ring-4',
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-100',
  ].join(' ')

/** Primary full-width submit button. */
export const submitButtonClass = [
  'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3',
  'text-[0.95rem] font-semibold text-white shadow-md shadow-brand-600/20',
  'transition duration-150 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25',
  'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 active:translate-y-px',
  'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-600',
].join(' ')

export default inputClass
