/** A 类：线索 / 伏笔 */
export type ClueStatus = 'open' | 'done';

export interface Clue {
  id: string;
  title: string;
  /** 线索详情：埋了什么、怎么回收、读者看到什么…… */
  detail: string;
  /** 可选短备注，不是 Google 链接 */
  note: string;
  status: ClueStatus;
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

/** 只允许 A–A 或 B–B */
export interface GraftLink {
  id: string;
  kind: ParticleKind;
  fromId: string;
  toId: string;
  label: string;
  createdAt: number;
}

export interface SimpleStore {
  version: 3;
  sheetUrl: string;
  clues: Clue[];
  values: ValueItem[];
  links: GraftLink[];
}

export const clueStatusLabel: Record<ClueStatus, string> = {
  open: '未回收',
  done: '已回收',
};

export function isGoogleDocLink(text: string): boolean {
  return /https?:\/\/(docs|sheets|drive)\.google\.com\//i.test(text.trim());
}

/** 兼容旧数据：补 detail；误塞在备注里的 Google 链接提出来 */
export function normalizeClue(raw: Partial<Clue> & { id: string; title: string }): Clue {
  const note = typeof raw.note === 'string' ? raw.note : '';
  let detail = typeof raw.detail === 'string' ? raw.detail : '';
  let cleanNote = note;

  if (!detail && note && !isGoogleDocLink(note)) {
    detail = note;
    cleanNote = '';
  }
  if (isGoogleDocLink(note)) {
    cleanNote = '';
  }
  if (isGoogleDocLink(detail)) {
    detail = '';
  }

  return {
    id: raw.id,
    title: raw.title,
    detail,
    note: cleanNote,
    status: raw.status === 'done' ? 'done' : 'open',
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
  };
}

export function isSimpleStore(raw: unknown): raw is SimpleStore {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    o.version === 3 &&
    typeof o.sheetUrl === 'string' &&
    Array.isArray(o.clues) &&
    Array.isArray(o.values) &&
    Array.isArray(o.links)
  );
}
