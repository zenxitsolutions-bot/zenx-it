import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// server/.local/emails — gitignored (see server/.gitignore), never committed. Dev/test's only
// transport: writes the rendered email to disk instead of sending it anywhere.
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.local', 'emails');

export async function sendViaConsole({ to, subject, html, text, attachment }) {
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = join(outDir, `${stamp}-${to.replace(/[^a-z0-9@.-]/gi, '_')}`);
  writeFileSync(`${base}.html`, html, 'utf8');
  writeFileSync(`${base}.txt`, `Subject: ${subject}\n\n${text}`, 'utf8');
  let suffix = '';
  if (attachment) {
    writeFileSync(`${base}-${attachment.filename}`, attachment.content, 'utf8');
    suffix = `, attachment ${attachment.filename} (${attachment.contentType})`;
  }
  console.log(`[email:console] "${subject}" → ${to} written to ${base}.{html,txt}${suffix}`);
  return { providerMessageId: null };
}
