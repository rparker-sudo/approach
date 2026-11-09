/**
 * People paste the Supabase Project URL in many shapes: with /rest/v1/ on the end
 * (from the Data API page), with a trailing slash or line break, or even the
 * dashboard link. The Supabase client needs just the origin, e.g. https://abcd.supabase.co.
 * Returns null when the value can't be a Supabase address.
 */
export function cleanSupabaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!s) return null;
  const dash = s.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  // Plain text matching (no URL class: React Native's built-in one is incomplete on iPhone).
  const m = s.match(/^(?:(https?):\/\/)?([^\/?#\s]+)/i);
  if (!m) return null;
  const scheme = (m[1] ?? 'https').toLowerCase();
  const host = m[2].toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (scheme !== 'https' && !local) return null;
  if (!local && !/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/.test(host)) return null;
  return `${scheme}://${host}`;
}

/** Trim spaces, quotes and line breaks from a pasted key. */
export function cleanKey(raw: string | undefined | null): string | null {
  const s = (raw ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
  return s || null;
}
