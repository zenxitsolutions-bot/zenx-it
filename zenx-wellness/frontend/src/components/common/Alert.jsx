const tones = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
}

const icons = {
  error: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z',
  success: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z',
  info: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0 1 1 0 002 0zm-1 3a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z',
}

/** Inline status banner — the one error/success treatment the auth screens share. */
export function Alert({ tone = 'error', children }) {
  if (!children) return null

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${tones[tone] ?? tones.info}`}
    >
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d={icons[tone] ?? icons.info} clipRule="evenodd" />
      </svg>
      <span>{children}</span>
    </div>
  )
}

export default Alert
