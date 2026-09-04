import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { collectFieldErrors, loginSchema } from '../../utils/validation.js'
import { inputClass } from './fieldStyles.js'
import PasswordField from './PasswordField.jsx'

const initialValues = { email: '', password: '', rememberMe: false }

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    // Clear the inline error as soon as the user starts fixing the field.
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error))
      return
    }

    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await login(parsed.data)
      const redirectTo = location.state?.from || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error.errors) setFieldErrors(error.errors)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{formError}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className={inputClass(Boolean(fieldErrors.email))}
        />
        {fieldErrors.email ? (
          <p id="email-error" className="mt-1.5 text-sm text-red-600">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <PasswordField
        value={values.password}
        onChange={handleChange}
        disabled={submitting}
        error={fieldErrors.password}
        className={inputClass(Boolean(fieldErrors.password))}
      />

      <div className="flex items-center justify-between gap-3">
        <label htmlFor="rememberMe" className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={values.rememberMe}
            onChange={handleChange}
            disabled={submitting}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 transition focus:ring-2 focus:ring-brand-200"
          />
          Remember me
        </label>

        <Link
          to="/forgot-password"
          className="rounded text-sm font-medium text-brand-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-[0.95rem] font-semibold text-white shadow-md shadow-brand-600/20 transition duration-150 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-600"
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}

export default LoginForm
