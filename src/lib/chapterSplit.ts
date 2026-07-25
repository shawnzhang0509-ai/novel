/**
 * Split raw novel paste by common chapter heading lines (Chinese / English).
 * Returns one blob if no headings found.
 */
const CHAPTER_LINE =
  /^\s*(第\s*[\d一二三四五六七八九十百千零]+\s*章|第\s*\d+\s*章|Chapter\s*\d+)\b/i;

export function splitByChapterHeadings(raw: string): { title: string; content: string }[] {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const lines = text.split('\n');
  const segments: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (!currentTitle && !body) return;
    const title = currentTitle.trim() || `片段 ${segments.length + 1}`;
    segments.push({ title, content: body });
    currentTitle = '';
    currentLines = [];
  };

  for (const line of lines) {
    if (CHAPTER_LINE.test(line)) {
      if (currentTitle || currentLines.length > 0) flush();
      currentTitle = line.trim();
      continue;
    }
    currentLines.push(line);
  }
  flush();

  if (segments.length === 0) return [];
  if (segments.length === 1 && !CHAPTER_LINE.test(segments[0].title)) {
    return [{ title: '', content: text }];
  }
  return segments;
}

/** First non-empty line if short enough to be a title; else empty. */
export function guessTitleFromFirstLine(raw: string, maxLen = 72): string {
  const line = raw.replace(/\r\n/g, '\n').trim().split('\n')[0]?.trim() ?? '';
  if (!line || line.length > maxLen) return '';
  if (line.length > 200) return '';
  return line;
}
