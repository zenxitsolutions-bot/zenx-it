/** Minimal HTML escaping — every value below lands inside an HTML attribute or body. */
const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Password-reset email. Kept as plain string templates on purpose: mail clients
 * strip most modern CSS, so the layout is tables-free, inline-styled and safe
 * to render as text when images or styles are blocked.
 */
export const passwordResetEmail = ({ firstName, resetUrl, workspaceName, expiresInMinutes }) => {
  const greeting = firstName ? `Hi ${escape(firstName)},` : 'Hi,'
  const workspace = escape(workspaceName)
  const url = escape(resetUrl)

  const subject = `Reset your ${workspaceName} password`

  const text = [
    greeting,
    '',
    `We received a request to reset the password for your ${workspaceName} account.`,
    '',
    'Open this link to choose a new password:',
    resetUrl,
    '',
    `The link expires in ${expiresInMinutes} minutes and can only be used once.`,
    'If you did not request this, you can safely ignore this email — your password will not change.',
    '',
    `— ${workspaceName}`,
  ].join('\n')

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">${workspace}</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">Reset your password</h1>

      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        We received a request to reset the password for your ${workspace} account.
        Choose a new one using the button below.
      </p>

      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 24px;border-radius:12px;">Set a new password</a>
      </p>

      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#64748b;">
        Or paste this link into your browser:<br />
        <a href="${url}" style="color:#2563eb;word-break:break-all;">${url}</a>
      </p>

      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
        This link expires in ${expiresInMinutes} minutes and can only be used once.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        If you did not request a reset, ignore this email — your password will not change.
      </p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${workspace}. Please do not reply to this message.</p>
    </div>
  </body>
</html>`

  return { subject, html, text }
}

export default passwordResetEmail
