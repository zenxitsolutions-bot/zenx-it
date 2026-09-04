import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { inputClass, submitButtonClass } from '../components/auth/fieldStyles.js'
import Alert from '../components/common/Alert.jsx'
import { requestPasswordReset } from '../services/authService.js'
import { collectFieldErrors, forgotPasswordSchema } from '../utils/validation.js'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Forgot password · ZenX Wellness'
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error))
      return
    }

    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await requestPasswordReset(parsed.data)
      // The server answers the same way for unknown addresses, so this screen
      // confirms the request rather than the account.
      setSentTo(parsed.data.email)
    } catch (error) {
      if (error.errors) setFieldErrors(error.errors)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const backToSignIn = (
    <Link
      to="/login"
      className="rounded font-medium text-brand-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      Back to sign in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" footer={backToSignIn}>
        <Alert tone="success">
          If <span className="font-medium">{sentTo}</span> is registered, a password reset link is
          on its way. It expires in 60 minutes.
        </Alert>

        <p className="mt-5 text-sm leading-relaxed text-slate-500">
          Nothing after a minute or two? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSentTo('')}
            className="rounded font-medium text-brand-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            try another address
          </button>
          .
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your work email and we'll send you a link to set a new one."
      footer={backToSignIn}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Alert>{formError}</Alert>

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
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldErrors({})
              setFormError('')
            }}
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

        <button type="submit" disabled={submitting} className={submitButtonClass}>
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Sending link...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword
