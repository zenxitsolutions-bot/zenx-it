// Shared shell for every transactional email this backend sends. Before this, each sender built a
// bare string of <p> tags — no branding, and any name/company value went into the HTML unescaped.
//
// Two constraints drive the markup, and both differ from normal web work:
//   1. No <style> block and no classes. Gmail strips <style> from the rendered body, so every rule
//      has to be an inline style attribute or it simply doesn't apply.
//   2. Tables, not flexbox. Outlook renders through Word's HTML engine, which has no flex/grid and
//      ignores max-width on a div — a table with a fixed-width cell is the only reliable way to
//      centre a card at a bounded width there.
// Webfonts are deliberately not loaded: most clients block them, so the stack names Plus Jakarta
// Sans first (it renders where the client happens to have it) and falls back to system faces.

const FONT = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
const PAGE_BG = '#f4f7fc';
const CARD_BG = '#ffffff';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#2563eb';

// Covers the five characters that can break out of an HTML text node or a quoted attribute value.
// Every interpolated value in an email body must pass through this — a display name is
// user-controlled data (customers pick their own), not trusted markup.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {object}   opts
 * @param {string}   opts.heading      Plain text — escaped here.
 * @param {string[]} opts.paragraphs   Plain text lines — escaped here.
 * @param {string}   [opts.ctaLabel]   Button text. Omit with ctaUrl for a message-only email.
 * @param {string}   [opts.ctaUrl]     Button target.
 * @param {string}   [opts.fallbackNote] Text introducing the copy-paste URL under the button.
 * @param {string}   [opts.footer]     Small print under the card rule.
 */
export function renderEmailLayout({ heading, paragraphs = [], ctaLabel, ctaUrl, fallbackNote, footer }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${escapeHtml(p)}</p>`)
    .join('');

  // A bare <a> styled as a block is used rather than a nested table button: it degrades to a
  // plain link everywhere, and this template has one action, not a toolbar to align.
  const cta = ctaUrl
    ? `<p style="margin:24px 0;">
         <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
       </p>`
    : '';

  // Long URLs overflow a fixed-width card in most clients; word-break is what keeps the fallback
  // link inside the card instead of stretching it.
  const fallback = ctaUrl
    ? `<p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(fallbackNote ?? 'If the button does not work, paste this link into your browser:')}</p>
       <p style="margin:0 0 8px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${escapeHtml(ctaUrl)}" style="color:${ACCENT};">${escapeHtml(ctaUrl)}</a></p>`
    : '';

  const smallPrint = footer
    ? `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0 16px;" />
       <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(footer)}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:100%;background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;">
          <tr>
            <td style="padding:32px;font-family:${FONT};">
              <p style="margin:0 0 24px;font-size:17px;font-weight:700;letter-spacing:.02em;color:${TEXT};">ZENX<span style="color:${ACCENT};">.</span></p>
              <h1 style="margin:0 0 16px;font-size:21px;font-weight:600;line-height:1.3;color:${TEXT};">${escapeHtml(heading)}</h1>
              ${body}
              ${cta}
              ${fallback}
              ${smallPrint}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${FONT};font-size:12px;color:${MUTED};">ZenX IT Solutions</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
