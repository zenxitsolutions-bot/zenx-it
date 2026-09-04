import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import PasswordField from '../components/auth/PasswordField.jsx'
import { inputClass, submitButtonClass } from '../components/auth/fieldStyles.js'
import Alert from '../components/common/Alert.jsx'
import FullPageLoader from '../components/common/FullPageLoader.jsx'
import { resetPassword, verifyResetToken } from '../services/authService.js'
import { collectFieldErrors, resetPasswordSchema } from '../utils/validation.js'

const initialValues = { password: '', confirmPassword: '' }

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  // A missing token is decided at render time — no request, and no effect.
  const [checking, setChecking] = useState(Boolean(token))
  const [linkError, setLinkError] = useState(
    token ? '' : 'This reset link is invalid or has expired. Please request a new one.',
  )
  const [accountEmail, setAccountEmail] = useState('')

  const [values, setValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Reset password · ZenX Wellness'
  }, [])

  // Validate the link before rendering the form: a stale link should say so
  // rather than fail after the user has typed a new password twice.
  useEffect(() => {
    let active = true

    if (!token) return undefined

    verifyResetToken(token)
      .then(({ email }) => {
        if (active) setAccountEmail(email)
      })
      .catch((error) => {
        if (active) setLinkError(error.message)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const parsed = resetPasswordSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error))
      return
    }

    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await resetPassword({ token, ...parsed.data })
      setDone(true)
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (error) {
      if (error.errors) setFieldErrors(error.errors)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const requestNewLink = (
    <Link
      to="/forgot-password"
      className="rounded font-medium text-brand-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      Request a new link
    </Link>
  )

  if (checking) return <FullPageLoader />

  if (linkError) {
    return (
      <AuthLayout title="Link no longer works" footer={requestNewLink}>
        <Alert>{linkError}</Alert>
        <p className="mt-5 text-sm leading-relaxed text-slate-500">
          Reset links expire after 60 minutes and can only be used once.
        </p>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        footer={
          <Link
            to="/login"
            className="rounded font-medium text-brand-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            Go to sign in
          </Link>
        }
      >
        <Alert tone="success">
          Your password has been changed. Taking you to the sign-in page...
        </Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={accountEmail ? `For ${accountEmail}` : 'Choose a password you have not used before.'}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Alert>{formError}</Alert>

        <PasswordField
          name="password"
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          disabled={submitting}
          error={fieldErrors.password}
          className={inputClass(Boolean(fieldErrors.password))}
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Repeat your new password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          disabled={submitting}
          error={fieldErrors.confirmPassword}
          className={inputClass(Boolean(fieldErrors.confirmPassword))}
        />

        <p className="text-xs leading-relaxed text-slate-500">
          Use at least 8 characters with an uppercase letter, a lowercase letter and a number.
        </p>

        <button type="submit" disabled={submitting} className={submitButtonClass}>
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Updating...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword
