/** A 类：线索 / 伏笔 */
export type ClueStatus = 'open' | 'done';

export interface Clue {
  id: string;
  title: string;
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
