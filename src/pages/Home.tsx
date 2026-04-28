import { useState, useMemo } from 'react';
import type { Thread, ThreadStatus } from '@/types/thread';
import { statusLabels } from '@/types/thread';
import { useThreads } from '@/hooks/useThreads';
import ThreadCard from '@/components/ThreadCard';
import ThreadForm from '@/components/ThreadForm';
import AIPromptModal from '@/components/AIPromptModal';
import DataManager from '@/components/DataManager';
import QuickPasteSheet from '@/components/QuickPasteSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ClipboardPaste,
  Search,
  Sparkles,
  Database,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  Layers,
  CheckCircle2,
  Timer,
  HelpCircle,
  Trash2,
  Users,
  Tag,
} from 'lucide-react';

const statusOrder: ThreadStatus[] = ['buried', 'pending', 'resolved', 'abandoned'];
const statusHeaderIcons = {
  buried: Timer,
  pending: HelpCircle,
  resolved: CheckCircle2,
  abandoned: Layers,
};

export default function Home() {
  const {
    threads,
    stats,
    addThread,
    addThreads,
    updateThread,
    deleteThread,
    exportData,
    importData,
  } = useThreads();

  const [formOpen, setFormOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [activeFilterChar, setActiveFilterChar] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<ThreadStatus, boolean>>({
    buried: false,
    pending: false,
    resolved: true,
    abandoned: true,
  });

  const allCharacters = useMemo(() =>
    Array.from(new Set(threads.flatMap(t => t.characters))).sort(),
  [threads]);

  const allTags = useMemo(() =>
    Array.from(new Set(threads.flatMap(t => t.tags))).sort(),
  [threads]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchesSearch = !search.trim() ||
        t.title.includes(search) ||
        t.content.includes(search) ||
        t.notes.includes(search) ||
        t.chapterBuried.includes(search) ||
        t.chapterResolved.includes(search);
      const matchesTag = !activeFilterTag || t.tags.includes(activeFilterTag);
      const matchesChar = !activeFilterChar || t.characters.includes(activeFilterChar);
      return matchesSearch && matchesTag && matchesChar;
    });
  }, [threads, search, activeFilterTag, activeFilterChar]);

  const grouped = useMemo(() => {
    const map: Record<ThreadStatus, Thread[]> = {
      buried: [],
      resolved: [],
      abandoned: [],
      pending: [],
    };
    for (const t of filteredThreads) {
      map[t.status].push(t);
    }
    return map;
  }, [filteredThreads]);

  const toggleCollapse = (status: ThreadStatus) => {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const openNew = () => {
    setEditingThread(null);
    setFormOpen(true);
  };

  const openEdit = (thread: Thread) => {
    setEditingThread(thread);
    setFormOpen(true);
  };

  const handleSave = (form: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingThread) {
      updateThread(editingThread.id, form);
    } else {
      addThread(form);
    }
  };

  const hasActiveFilters = activeFilterTag || activeFilterChar || search;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">草蛇灰线</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDataOpen(true)}>
              <Database className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-primary/5 rounded-lg p-2 text-center">
            <div className="text-lg font-bold leading-none">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-1">总线索</div>
          </div>
          <div className="bg-amber-500/8 rounded-lg p-2 text-center">
            <div className="text-lg font-bold leading-none text-amber-500">{stats.buried}</div>
            <div className="text-[10px] text-muted-foreground mt-1">未回收</div>
          </div>
          <div className="bg-violet-500/8 rounded-lg p-2 text-center">
            <div className="text-lg font-bold leading-none text-violet-500">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground mt-1">待定</div>
          </div>
          <div className="bg-emerald-500/8 rounded-lg p-2 text-center">
            <div className="text-lg font-bold leading-none text-emerald-500">{stats.resolved}</div>
            <div className="text-[10px] text-muted-foreground mt-1">已回收</div>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索线索、章节、内容..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Quick filters */}
        {(allTags.length > 0 || allCharacters.length > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {hasActiveFilters && (
              <button
                onClick={() => { setActiveFilterTag(null); setActiveFilterChar(null); setSearch(''); }}
                className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
              >
                清除筛选
              </button>
            )}
            {allCharacters.slice(0, 6).map(c => (
              <button
                key={c}
                onClick={() => setActiveFilterChar(activeFilterChar === c ? null : c)}
                className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  activeFilterChar === c
                    ? 'bg-secondary text-secondary-foreground border-secondary'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                <Users className="w-3 h-3" />
                {c}
              </button>
            ))}
            {allTags.slice(0, 6).map(t => (
              <button
                key={t}
                onClick={() => setActiveFilterTag(activeFilterTag === t ? null : t)}
                className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  activeFilterTag === t
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                <Tag className="w-3 h-3" />
                {t}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-3 pb-24">
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Layers className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">还没有线索</p>
            <p className="text-xs mt-1 opacity-70">点击右下角按钮埋下第一个伏笔</p>
          </div>
        )}

        {statusOrder.map(status => {
          const list = grouped[status];
          if (list.length === 0 && !hasActiveFilters) return null;
          if (list.length === 0 && hasActiveFilters) return null;
          const isCollapsed = collapsed[status];
          const Icon = statusHeaderIcons[status];

          return (
            <div key={status} className="mb-4">
              <button
                onClick={() => toggleCollapse(status)}
                className="flex items-center justify-between w-full py-2 text-left group"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${
                    status === 'buried' ? 'text-amber-500' :
                    status === 'resolved' ? 'text-emerald-500' :
                    status === 'abandoned' ? 'text-slate-400' :
                    'text-violet-500'
                  }`} />
                  <span className="text-sm font-semibold">{statusLabels[status]}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {list.length}
                  </Badge>
                </div>
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </button>

              {!isCollapsed && (
                <div className="space-y-1">
                  {list.map(thread => (
                    <div key={thread.id} className="relative group/card">
                      <ThreadCard thread={thread} onClick={openEdit} />
                      <button
                        onClick={() => {
                          if (confirm('确定删除这条线索？')) deleteThread(thread.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-destructive/90 text-destructive-foreground opacity-0 group-hover/card:opacity-100 transition-opacity"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 z-40 flex items-center gap-2 max-w-3xl mx-auto w-full">
        <Button
          variant="secondary"
          className="h-12 px-3 shrink-0 gap-1.5 text-xs font-medium"
          onClick={() => setQuickPasteOpen(true)}
          title="粘贴整章或 GPT 对话，少填表"
        >
          <ClipboardPaste className="w-4 h-4 shrink-0" />
          <span className="max-[340px]:sr-only">粘贴</span>
        </Button>
        <Button
          variant="default"
          className="flex-1 h-12 gap-2 text-sm font-semibold shadow-lg min-w-0"
          onClick={openNew}
        >
          <Plus className="w-4 h-4 shrink-0" />
          埋新坑
        </Button>
        <Button
          variant="outline"
          className="h-12 px-3 sm:px-4 gap-2 text-sm font-medium border-primary/30 text-primary shrink-0"
          onClick={() => setAiOpen(true)}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          AI串联
        </Button>
      </div>

      <ThreadForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        editThread={editingThread}
        allCharacters={allCharacters}
        allTags={allTags}
      />

      <AIPromptModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        threads={threads}
      />

      <DataManager
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        onExport={exportData}
        onImport={importData}
      />

      <QuickPasteSheet
        open={quickPasteOpen}
        onClose={() => setQuickPasteOpen(false)}
        onSaveMany={addThreads}
      />
    </div>
  );
}
