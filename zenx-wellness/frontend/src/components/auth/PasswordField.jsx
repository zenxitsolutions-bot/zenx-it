import { useState } from 'react'

export function PasswordField({
  value,
  onChange,
  disabled,
  error,
  className,
  // Defaults keep the sign-in usage unchanged; the reset screen renders two of
  // these, so every identifying attribute has to be overridable.
  name = 'password',
  label = 'Password',
  placeholder = 'Enter your password',
  autoComplete = 'current-password',
}) {
  const [visible, setVisible] = useState(false)
  const errorId = `${name}-error`

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${className} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
              <path
                d="M6.7 6.8C4.6 8.1 3 10 2 12c2 3.9 5.6 6.5 10 6.5 1.7 0 3.3-.4 4.7-1.1M9.9 5.7A9.9 9.9 0 0112 5.5c4.4 0 8 2.6 10 6.5-.8 1.6-1.9 3-3.3 4.1"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M2 12c2-3.9 5.6-6.5 10-6.5S20 8.1 22 12c-2 3.9-5.6 6.5-10 6.5S4 15.9 2 12z" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default PasswordField
