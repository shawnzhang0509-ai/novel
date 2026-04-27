export type ThreadStatus = 'buried' | 'resolved' | 'abandoned' | 'pending';

export interface Thread {
  id: string;
  title: string;
  content: string;
  chapterBuried: string;
  chapterResolved: string;
  status: ThreadStatus;
  characters: string[];
  tags: string[];
  targetChapter: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export const statusLabels: Record<ThreadStatus, string> = {
  buried: '已埋下',
  resolved: '已回收',
  abandoned: '已废弃',
  pending: '待定',
};

export const statusColors: Record<ThreadStatus, string> = {
  buried: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  abandoned: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  pending: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};
