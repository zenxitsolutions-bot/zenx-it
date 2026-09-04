export function Logo({ className = '', variant = 'dark' }) {
  const markShell = variant === 'light' ? 'bg-white/15 ring-1 ring-white/30' : 'bg-brand-600'
  const markGlyph = variant === 'light' ? 'text-white' : 'text-white'
  const wordmark = variant === 'light' ? 'text-white' : 'text-slate-900'
  const suffix = variant === 'light' ? 'text-brand-200' : 'text-brand-600'

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${markShell} shadow-sm`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${markGlyph}`} fill="none">
          <path
            d="M7 7h10L7 17h10"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={`text-[1.35rem] font-semibold tracking-tight ${wordmark}`}>
        Zen<span className={suffix}>X</span>
      </span>
    </span>
  )
}

export default Logo
