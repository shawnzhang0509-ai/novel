/** Normalize pasted Google / https manuscript links for open + store. */
export function normalizeManuscriptUrl(raw: string): string {
  let s = raw.trim().replace(/[\u200b-\u200d\ufeff]/g, '');
  if (!s) return '';
  // common paste: "https://..." with trailing junk spaces/newlines already trimmed
  if (!/^https?:\/\//i.test(s) && /^(docs|sheets|drive)\.google\.com\//i.test(s)) {
    s = `https://${s}`;
  }
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}/i.test(s)) {
    s = `https://${s}`;
  }
  return s;
}

export function isOpenableUrl(url: string): boolean {
  try {
    const u = new URL(normalizeManuscriptUrl(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
