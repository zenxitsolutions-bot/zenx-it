import env from '../config/env.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Sends one transactional email through Resend.
 *
 * Delivery is best-effort: a mail failure must never turn into a failed
 * request for the user, so callers get `{ delivered }` back instead of a
 * throw. With no API key configured we log the payload and carry on, which
 * keeps local development working without a Resend account.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.resendApiKey) {
    console.warn(`[email] RESEND_API_KEY not set — "${subject}" to ${to} was not sent`)
    if (text) console.warn(`[email] preview:\n${text}`)
    return { delivered: false, skipped: true }
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.mailFrom,
        to: [to],
        subject,
        html,
        text,
        ...(env.mailReplyTo ? { reply_to: env.mailReplyTo } : {}),
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      // Resend answers with { name, message } on failure — the message names
      // the real cause (unverified domain, bad key, blocked recipient).
      const reason = payload?.message || `HTTP ${response.status}`
      console.error(`[email] Resend rejected "${subject}" to ${to}: ${reason}`)
      return { delivered: false, error: reason }
    }

    console.info(`[email] sent "${subject}" to ${to} (id ${payload?.id ?? 'unknown'})`)
    return { delivered: true, id: payload?.id ?? null }
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, error.message)
    return { delivered: false, error: error.message }
  }
}

export default { sendEmail }
