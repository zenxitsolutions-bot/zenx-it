import Logo from '../common/Logo.jsx'

const highlights = [
  'Centralised administration for every partner organisation',
  'Programme, nutrition and training oversight in one console',
  'Role-based access built for enterprise wellness teams',
]

/**
 * Shared shell for the signed-out screens (sign in, forgot password, reset
 * password) so they keep one identity — brand panel on the left, a single card
 * on the right.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel — desktop only */}
      <section className="relative hidden w-1/2 overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(89,155,255,0.55),transparent_55%),radial-gradient(circle_at_82%_78%,rgba(20,34,72,0.85),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/3 h-[28rem] w-[28rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-24 h-[34rem] w-[34rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-1/4 h-[26rem] w-[26rem] rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative">
          <Logo variant="light" />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-[2.75rem]">
            The wellness platform your organisation runs on.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/90">
            ZenX brings companies, coaches and members together in a single, secure
            workspace — so your team can focus on outcomes, not admin.
          </p>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-brand-100/85">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 20 20" className="h-3 w-3 text-white" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-brand-200/70">Enterprise wellness, simplified.</p>
      </section>

      {/* Form panel */}
      <section className="flex w-full flex-col items-center justify-center bg-slate-50 px-5 py-10 sm:px-8 lg:w-1/2 lg:bg-white">
        <div className="w-full max-w-[26rem]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-7">
              <Logo className="mb-7" />
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
              {subtitle ? <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p> : null}
            </div>

            {children}
          </div>

          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}

          <p className="mt-6 text-center text-xs text-slate-400">© 2026 ZenX</p>
        </div>
      </section>
    </div>
  )
}

export default AuthLayout
