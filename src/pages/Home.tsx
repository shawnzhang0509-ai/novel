import { useMemo, useState } from 'react';
import { useSimpleStore } from '@/hooks/useSimpleStore';
import type { Article, Clue, ValueItem } from '@/types/simple';
import { clueStatusLabel } from '@/types/simple';
import { isOpenableUrl, normalizeManuscriptUrl } from '@/lib/url';
import ArticleForm from '@/components/ArticleForm';
import ClueForm from '@/components/ClueForm';
import ValueForm from '@/components/ValueForm';
import ParticleSea from '@/components/ParticleSea';
import DataManager from '@/components/DataManager';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Database,
  ExternalLink,
  Plus,
  Orbit,
  Trash2,
  Check,
} from 'lucide-react';

type Tab = 'articles' | 'values' | 'sea';

export default function Home() {
  const {
    store,
    articles,
    articleMap,
    clues,
    values,
    links,
    stats,
    addArticleWithClues,
    updateArticle,
    deleteArticle,
    addClueNames,
    updateClue,
    deleteClue,
    addValue,
    updateValue,
    deleteValue,
    addLink,
    deleteLink,
    exportData,
    importData,
    replaceStore,
  } = useSimpleStore();

  const [tab, setTab] = useState<Tab>('articles');
  const [dataOpen, setDataOpen] = useState(false);
  const [articleOpen, setArticleOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [clueOpen, setClueOpen] = useState(false);
  const [editClue, setEditClue] = useState<Clue | null>(null);
  const [valueOpen, setValueOpen] = useState(false);
  const [editValue, setEditValue] = useState<ValueItem | null>(null);

  const cluesByArticle = useMemo(() => {
    const map = new Map<string, Clue[]>();
    for (const c of clues) {
      const key = c.articleId || '__none__';
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [clues]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col max-w-3xl mx-auto">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 pt-3 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">草蛇灰线</h1>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setDataOpen(true)}
            title="备份 / 云同步"
          >
            <Database className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          一篇 Google 文章挂多条线索名；粒子海里可跨文章连线（A–A / B–B）。
        </p>

        <div className="grid grid-cols-3 gap-2">
          <Stat n={stats.articles} label="文章" tone="sky" />
          <Stat n={stats.open} label="未回收线索" tone="amber" />
          <Stat n={stats.links} label="连线" tone="violet" />
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/40 border border-border/60">
          {(
            [
              { key: 'articles' as const, label: '文章/线索' },
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
        {tab === 'articles' && (
          <div className="space-y-4">
            {articles.length === 0 && (
              <Empty tip="点下方「加文章」：贴 Google 链接、写标题、加几条线索名即可。" />
            )}
            {articles.map(a => {
              const list = cluesByArticle.get(a.id) || [];
              return (
                <section key={a.id} className="rounded-xl border border-border bg-card/50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border/70 flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left min-w-0 flex-1"
                      onClick={() => {
                        setEditArticle(a);
                        setArticleOpen(true);
                      }}
                    >
                      <div className="text-sm font-semibold truncate">{a.title}</div>
                      {a.sheetUrl ? (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{a.sheetUrl}</div>
                      ) : (
                        <div className="text-[11px] text-amber-400/80 mt-0.5">尚未粘贴 Google 链接</div>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isOpenableUrl(a.sheetUrl) && (
                        <a
                          href={normalizeManuscriptUrl(a.sheetUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-sky-400 hover:bg-sky-500/10"
                          onClick={e => e.stopPropagation()}
                          title="打开 Google"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('删除这篇文章及其线索？')) deleteArticle(a.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <ul className="divide-y divide-border/50">
                    {list.length === 0 && (
                      <li className="px-3 py-3 text-xs text-muted-foreground">还没有线索名，点文章标题添加</li>
                    )}
                    {list.map(c => (
                      <li key={c.id} className="px-3 py-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0"
                          onClick={() => {
                            setEditClue(c);
                            setClueOpen(true);
                          }}
                        >
                          <span className="text-sm font-medium truncate block">{c.title}</span>
                        </button>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                            c.status === 'open'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-emerald-500/40 text-emerald-400'
                          }`}
                        >
                          {clueStatusLabel[c.status]}
                        </span>
                        {c.status === 'open' && (
                          <button
                            type="button"
                            className="p-1 text-emerald-400/90"
                            title="标为已回收"
                            onClick={() => updateClue(c.id, { status: 'done' })}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm('删除这条线索？')) deleteClue(c.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {(cluesByArticle.get('__none__') || []).length > 0 && (
              <section className="rounded-xl border border-dashed border-border px-3 py-2">
                <div className="text-xs text-muted-foreground mb-2">未挂文章的旧线索</div>
                {(cluesByArticle.get('__none__') || []).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full text-left text-sm py-1.5"
                    onClick={() => {
                      setEditClue(c);
                      setClueOpen(true);
                    }}
                  >
                    {c.title}
                  </button>
                ))}
              </section>
            )}
          </div>
        )}

        {tab === 'values' && (
          <div className="space-y-2">
            {values.length === 0 && (
              <Empty tip="加几个贯穿全书的价值观/主题。" />
            )}
            {values.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setEditValue(v);
                  setValueOpen(true);
                }}
                className="w-full text-left rounded-xl border border-border bg-card/60 px-3 py-3"
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
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('删除？')) deleteValue(v.id);
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
            articleMap={articleMap}
            onAddLink={addLink}
            onDeleteLink={deleteLink}
          />
        )}
      </main>

      {tab !== 'sea' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 z-40 max-w-3xl mx-auto w-full">
          <Button
            className="w-full h-12 gap-2 text-sm font-semibold"
            onClick={() => {
              if (tab === 'articles') {
                setEditArticle(null);
                setArticleOpen(true);
              } else {
                setEditValue(null);
                setValueOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4" />
            {tab === 'articles' ? '加文章（可多条线索）' : '加价值观 B'}
          </Button>
        </div>
      )}

      <ArticleForm
        open={articleOpen}
        onClose={() => setArticleOpen(false)}
        edit={editArticle}
        existingClueCount={editArticle ? (cluesByArticle.get(editArticle.id) || []).length : 0}
        onCreate={addArticleWithClues}
        onUpdate={data => {
          if (editArticle) updateArticle(editArticle.id, data);
        }}
        onAddNames={names => {
          if (editArticle) addClueNames(editArticle.id, names);
        }}
      />

      <ClueForm
        open={clueOpen}
        onClose={() => setClueOpen(false)}
        edit={editClue}
        articleTitle={editClue ? articleMap.get(editClue.articleId)?.title : undefined}
        onSave={data => {
          if (editClue) updateClue(editClue.id, data);
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
        store={store}
        onExport={exportData}
        onImport={importData}
        onReplaceStore={replaceStore}
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
