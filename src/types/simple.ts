/** A 类：线索（只要名字即可） */
export type ClueStatus = 'open' | 'done';

/** 一篇正文：一个 Google 链接 + 标题，可挂多条线索 */
export interface Article {
  id: string;
  title: string;
  sheetUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface Clue {
  id: string;
  /** 所属文章；空字符串表示未挂文章（旧数据兜底） */
  articleId: string;
  title: string;
  status: ClueStatus;
  /** 兼容旧字段，新流程可留空 */
  detail: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

/** B 类：价值观 / 主题 */
export interface ValueItem {
  id: string;
  title: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type ParticleKind = 'clue' | 'value';

/** A–A 或 B–B；不同文章的线索也可以互连 */
export interface GraftLink {
  id: string;
  kind: ParticleKind;
  fromId: string;
  toId: string;
  label: string;
  createdAt: number;
}

export interface SimpleStore {
  version: 4;
  articles: Article[];
  clues: Clue[];
  values: ValueItem[];
  links: GraftLink[];
  /** @deprecated v3 遗留，迁移后可空 */
  sheetUrl?: string;
}

export const clueStatusLabel: Record<ClueStatus, string> = {
  open: '未回收',
  done: '已回收',
};

export function isGoogleDocLink(text: string): boolean {
  return /https?:\/\/(docs|sheets|drive)\.google\.com\//i.test(text.trim());
}

export function normalizeClue(raw: Partial<Clue> & { id: string; title: string }): Clue {
  return {
    id: raw.id,
    articleId: typeof raw.articleId === 'string' ? raw.articleId : '',
    title: raw.title.trim(),
    status: raw.status === 'done' ? 'done' : 'open',
    detail: typeof raw.detail === 'string' ? raw.detail : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
  };
}

export function normalizeArticle(raw: Partial<Article> & { id: string }): Article {
  return {
    id: raw.id,
    title: (raw.title || '').trim() || '未命名文章',
    sheetUrl: (raw.sheetUrl || '').trim(),
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
  };
}

export function isSimpleStore(raw: unknown): raw is SimpleStore {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.clues) || !Array.isArray(o.values) || !Array.isArray(o.links)) return false;
  if (o.version === 4 && Array.isArray(o.articles)) return true;
  // v3 legacy
  if (o.version === 3 && typeof o.sheetUrl === 'string') return true;
  return false;
}
