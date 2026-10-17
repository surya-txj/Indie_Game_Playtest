const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Makes coordinator text safe for the public game page: strips HTML, email
 * addresses, URLs and any of the given names (tester names), then tidies spaces.
 */
export function sanitizePublicText(text, { names = [] } = {}) {
  let out = String(text ?? '');
  out = out.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  out = out.replace(/<[^>]*>/g, ' ');
  out = out.replace(/&[a-z#0-9]+;/gi, ' ');
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]');
  out = out.replace(/\b(?:https?:\/\/|www\.)[^\s]+/gi, '[link removed]');

  const parts = new Set();
  for (const name of names) {
    const trimmed = String(name ?? '').trim();
    if (trimmed.length < 2) continue;
    parts.add(trimmed);
    for (const piece of trimmed.split(/\s+/)) if (piece.length >= 3) parts.add(piece);
  }
  // Longest first, so "Ada Lovelace" is removed before "Ada".
  for (const part of [...parts].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, 'gi'), 'a tester');
  }

  return out.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}
