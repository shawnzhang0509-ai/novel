import { useEffect, useState } from 'react';
import { useSimpleStore } from '@/hooks/useSimpleStore';
import type { Clue, ValueItem } from '@/types/simple';
import { clueStatusLabel } from '@/types/simple';
import ClueForm from '@/components/ClueForm';
import ValueForm from '@/components/ValueForm';
import ParticleSea from '@/components/ParticleSea';
import DataManager from '@/components/DataManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Database,
  ExternalLink,
  Plus,
  Orbit,
  Trash2,
  Check,
} from 'lucide-react';

type Tab = 'clues' | 'values' | 'sea';

export default function Home() {
  const {
    sheetUrl,
    clues,
    values,
    links,
    stats,
    setSheetUrl,
    addClue,
    updateClue,
    deleteClue,
    addValue,
    updateValue,
    deleteValue,
    addLink,
    deleteLink,
    exportData,
    importData,
  } = useSimpleStore();

  const [tab, setTab] = useState<Tab>('clues');
  const [sheetDraft, setSheetDraft] = useState(sheetUrl);

  useEffect(() => {
    setSheetDraft(sheetUrl);
  }, [sheetUrl]);
  const [dataOpen, setDataOpen] = useState(false);
  const [clueOpen, setClueOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [editClue, setEditClue] = useState<Clue | null>(null);
  const [editValue, setEditValue] = useState<ValueItem | null>(null);

  const openNewClue = () => {
    setEditClue(null);
    setClueOpen(true);
  };
  const openNewValue = () => {
    setEditValue(null);
    setValueOpen(true);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col max-w-3xl mx-auto">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 pt-3 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">草蛇灰线</h1>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDataOpen(true)}>
            <Database className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* 一份正文 ↔ 多条线索 */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">正文（Google Sheet / Doc）</div>
          <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
            一个链接对应整篇文章；下面的 A 线索可以挂很多条，详情写在线索里。
          </p>
          <div className="flex gap-2">
            <Input
              value={sheetDraft}
              onChange={e => setSheetDraft(e.target.value)}
              onBlur={() => setSheetUrl(sheetDraft.trim())}
              placeholder="粘贴表格或文档链接…"
              className="h-10 text-sm"
              inputMode="url"
            />
            <Button
              variant="secondary"
              className="h-10 px-3 shrink-0"
              disabled={!sheetDraft.trim()}
              onClick={() => {
                const url = sheetDraft.trim();
                setSheetUrl(url);
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat n={stats.open} label="未回收 A" tone="amber" />
          <Stat n={stats.values} label="价值观 B" tone="violet" />
          <Stat n={stats.links} label="连线" tone="sky" />
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/40 border border-border/60">
          {(
            [
              { key: 'clues' as const, label: 'A 线索' },
              { key: 'values' as const, label: 'B 价值观' },
              { key: 'sea' as const, label: '粒子海', icon: true },
            ] as const
          ).map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === item.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {'icon' in item && item.icon ? <Orbit className="w-3.5 h-3.5" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-3 pb-24">
        {tab === 'clues' && (
          <div className="space-y-2">
            {clues.length === 0 && (
              <Empty tip="点下方「加线索」：标题 + 详情即可。正文链接在顶部，一条文章对多条线索。" />
            )}
            {clues.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setEditClue(c);
                  setClueOpen(true);
                }}
                className="w-full text-left rounded-xl border border-border bg-card/60 px-3 py-3 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{c.title}</div>
                    {(c.detail || c.note) && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                        {c.detail || c.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        c.status === 'open'
                          ? 'border-amber-500/40 text-amber-400'
                          : 'border-emerald-500/40 text-emerald-400'
                      }`}
                    >
                      {clueStatusLabel[c.status]}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('删除这条线索？')) deleteClue(c.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {c.status === 'open' && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90"
                      onClick={e => {
                        e.stopPropagation();
                        updateClue(c.id, { status: 'done' });
                      }}
                    >
                      <Check className="w-3 h-3" />
                      标为已回收
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {tab === 'values' && (
          <div className="space-y-2">
            {values.length === 0 && (
              <Empty tip="加几个你想贯穿全书的价值观/主题，例如「正义的代价」。" />
            )}
            {values.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setEditValue(v);
                  setValueOpen(true);
                }}
                className="w-full text-left rounded-xl border border-border bg-card/60 px-3 py-3 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      <span className="text-violet-300 mr-1.5">B</span>
                      {v.title}
                    </div>
                    {v.note && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive shrink-0"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('删除这条价值观？')) deleteValue(v.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'sea' && (
          <ParticleSea
            clues={clues}
            values={values}
            links={links}
            onAddLink={addLink}
            onDeleteLink={deleteLink}
          />
        )}
      </main>

      {tab !== 'sea' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 z-40 max-w-3xl mx-auto w-full">
          <Button
            className="w-full h-12 gap-2 text-sm font-semibold"
            onClick={tab === 'clues' ? openNewClue : openNewValue}
          >
            <Plus className="w-4 h-4" />
            {tab === 'clues' ? '加线索 A' : '加价值观 B'}
          </Button>
        </div>
      )}

      <ClueForm
        open={clueOpen}
        onClose={() => setClueOpen(false)}
        edit={editClue}
        sheetUrl={sheetUrl}
        onSave={data => {
          if (editClue) updateClue(editClue.id, data);
          else addClue(data);
        }}
      />

      <ValueForm
        open={valueOpen}
        onClose={() => setValueOpen(false)}
        edit={editValue}
        onSave={data => {
          if (editValue) updateValue(editValue.id, data);
          else addValue(data);
        }}
      />

      <DataManager
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        onExport={exportData}
        onImport={importData}
      />
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: 'amber' | 'violet' | 'sky' }) {
  const color =
    tone === 'amber' ? 'text-amber-400 bg-amber-500/8' :
    tone === 'violet' ? 'text-violet-300 bg-violet-500/8' :
    'text-sky-400 bg-sky-500/8';
  return (
    <div className={`rounded-lg p-2 text-center ${color}`}>
      <div className="text-lg font-bold leading-none">{n}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Empty({ tip }: { tip: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <p className="text-sm">还是空的</p>
      <p className="text-xs mt-2 opacity-80 px-6 leading-relaxed">{tip}</p>
    </div>
  );
}
