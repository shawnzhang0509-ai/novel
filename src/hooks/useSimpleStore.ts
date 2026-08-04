import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Article, Clue, GraftLink, ParticleKind, SimpleStore, ValueItem } from '@/types/simple';
import { isSimpleStore, normalizeArticle, normalizeClue } from '@/types/simple';
import { normalizeManuscriptUrl } from '@/lib/url';

const STORAGE_KEY = 'snake-simple-v4';
const V3_KEY = 'snake-simple-v3';
const V2_KEY = 'snake-novel-v2';
const V1_KEY = 'snake-threads-v1';

function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function empty(): SimpleStore {
  return { version: 4, articles: [], clues: [], values: [], links: [] };
}

function finalizeStore(raw: SimpleStore): SimpleStore {
  const articles = (raw.articles || []).map(a => normalizeArticle(a));
  const articleIds = new Set(articles.map(a => a.id));
  const clues = (raw.clues || []).map(c => {
    const n = normalizeClue(c);
    if (n.articleId && !articleIds.has(n.articleId)) n.articleId = '';
    return n;
  });
  return {
    version: 4,
    articles,
    clues,
    values: raw.values || [],
    links: raw.links || [],
  };
}

function migrateFromV3(parsed: {
  sheetUrl?: string;
  clues?: Partial<Clue>[];
  values?: ValueItem[];
  links?: GraftLink[];
}): SimpleStore {
  const store = empty();
  store.values = parsed.values || [];
  store.links = parsed.links || [];
  const sheetUrl = normalizeManuscriptUrl(parsed.sheetUrl || '');
  let articleId = '';
  if (sheetUrl || (parsed.clues && parsed.clues.length > 0)) {
    articleId = id();
    store.articles.push(
      normalizeArticle({
        id: articleId,
        title: '文章 1',
        sheetUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
  }
  store.clues = (parsed.clues || []).map(c =>
    normalizeClue({
      ...c,
      id: c.id || id(),
      title: c.title || '未命名线索',
      articleId: articleId,
    })
  );
  return finalizeStore(store);
}

function migrate(): SimpleStore {
  try {
    const v4 = localStorage.getItem(STORAGE_KEY);
    if (v4) {
      const parsed = JSON.parse(v4) as unknown;
      if (isSimpleStore(parsed) && (parsed as SimpleStore).version === 4) {
        return finalizeStore(parsed as SimpleStore);
      }
    }
  } catch {
    /* continue */
  }

  try {
    const v3 = localStorage.getItem(V3_KEY);
    if (v3) {
      const parsed = JSON.parse(v3) as unknown;
      if (isSimpleStore(parsed)) return migrateFromV3(parsed as SimpleStore);
    }
  } catch {
    /* continue */
  }

  const store = empty();
  try {
    const v2raw = localStorage.getItem(V2_KEY);
    if (v2raw) {
      const v2 = JSON.parse(v2raw) as {
        threads?: { id: string; title: string; content?: string; notes?: string; status?: string; tags?: string[] }[];
        links?: GraftLink[];
      };
      const articleId = id();
      store.articles.push(normalizeArticle({ id: articleId, title: '文章 1', sheetUrl: '' }));
      if (Array.isArray(v2.threads)) {
        for (const t of v2.threads) {
          const isValue = (t.tags || []).some(tag => /价值|主题|观/.test(tag));
          if (isValue) {
            store.values.push({
              id: t.id,
              title: t.title,
              note: t.content || t.notes || '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } else {
            store.clues.push(
              normalizeClue({
                id: t.id,
                title: t.title,
                articleId,
                status: t.status === 'resolved' ? 'done' : 'open',
              })
            );
          }
        }
      }
      if (Array.isArray(v2.links)) store.links = v2.links;
      return finalizeStore(store);
    }
  } catch {
    /* continue */
  }

  try {
    const v1raw = localStorage.getItem(V1_KEY);
    if (v1raw) {
      const threads = JSON.parse(v1raw) as { id: string; title: string; status?: string }[];
      const articleId = id();
      store.articles.push(normalizeArticle({ id: articleId, title: '文章 1', sheetUrl: '' }));
      if (Array.isArray(threads)) {
        store.clues = threads.map(t =>
          normalizeClue({
            id: t.id,
            title: t.title,
            articleId,
            status: t.status === 'resolved' ? 'done' : 'open',
          })
        );
      }
    }
  } catch {
    /* ignore */
  }

  return finalizeStore(store);
}

export function useSimpleStore() {
  const [store, setStore] = useState<SimpleStore>(migrate);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const addArticleWithClues = useCallback(
    (input: { title: string; sheetUrl: string; clueNames: string[] }) => {
      const now = Date.now();
      const articleId = id();
      const article = normalizeArticle({
        id: articleId,
        title: input.title,
        sheetUrl: normalizeManuscriptUrl(input.sheetUrl),
        createdAt: now,
        updatedAt: now,
      });
      const names = input.clueNames.map(n => n.trim()).filter(Boolean);
      const clues = names.map((title, i) =>
        normalizeClue({
          id: id() + i.toString(36),
          articleId,
          title,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        })
      );
      setStore(prev => ({
        ...prev,
        articles: [article, ...prev.articles],
        clues: [...clues, ...prev.clues],
      }));
      return articleId;
    },
    []
  );

  const updateArticle = useCallback((aid: string, updates: Partial<Pick<Article, 'title' | 'sheetUrl'>>) => {
    setStore(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === aid
          ? normalizeArticle({
              ...a,
              ...updates,
              sheetUrl: updates.sheetUrl !== undefined ? normalizeManuscriptUrl(updates.sheetUrl) : a.sheetUrl,
              updatedAt: Date.now(),
            })
          : a
      ),
    }));
  }, []);

  const deleteArticle = useCallback((aid: string) => {
    setStore(prev => {
      const clueIds = new Set(prev.clues.filter(c => c.articleId === aid).map(c => c.id));
      return {
        ...prev,
        articles: prev.articles.filter(a => a.id !== aid),
        clues: prev.clues.filter(c => c.articleId !== aid),
        links: prev.links.filter(
          l => !(l.kind === 'clue' && (clueIds.has(l.fromId) || clueIds.has(l.toId)))
        ),
      };
    });
  }, []);

  const addClueNames = useCallback((articleId: string, names: string[]) => {
    const now = Date.now();
    const clues = names
      .map(n => n.trim())
      .filter(Boolean)
      .map((title, i) =>
        normalizeClue({
          id: id() + i.toString(36),
          articleId,
          title,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        })
      );
    if (clues.length === 0) return;
    setStore(prev => ({ ...prev, clues: [...clues, ...prev.clues] }));
  }, []);

  const updateClue = useCallback(
    (cid: string, updates: Partial<Pick<Clue, 'title' | 'status' | 'articleId' | 'detail' | 'note'>>) => {
      setStore(prev => ({
        ...prev,
        clues: prev.clues.map(c =>
          c.id === cid ? normalizeClue({ ...c, ...updates, updatedAt: Date.now() }) : c
        ),
      }));
    },
    []
  );

  const deleteClue = useCallback((cid: string) => {
    setStore(prev => ({
      ...prev,
      clues: prev.clues.filter(c => c.id !== cid),
      links: prev.links.filter(l => !(l.kind === 'clue' && (l.fromId === cid || l.toId === cid))),
    }));
  }, []);

  const addValue = useCallback((partial: Pick<ValueItem, 'title' | 'note'>) => {
    const now = Date.now();
    const item: ValueItem = { ...partial, id: id(), createdAt: now, updatedAt: now };
    setStore(prev => ({ ...prev, values: [item, ...prev.values] }));
    return item.id;
  }, []);

  const updateValue = useCallback((vid: string, updates: Partial<Pick<ValueItem, 'title' | 'note'>>) => {
    setStore(prev => ({
      ...prev,
      values: prev.values.map(v => (v.id === vid ? { ...v, ...updates, updatedAt: Date.now() } : v)),
    }));
  }, []);

  const deleteValue = useCallback((vid: string) => {
    setStore(prev => ({
      ...prev,
      values: prev.values.filter(v => v.id !== vid),
      links: prev.links.filter(l => !(l.kind === 'value' && (l.fromId === vid || l.toId === vid))),
    }));
  }, []);

  const addLink = useCallback((kind: ParticleKind, fromId: string, toId: string, label = '') => {
    if (fromId === toId) return null;
    let ok = false;
    setStore(prev => {
      const pool = kind === 'clue' ? prev.clues : prev.values;
      if (!pool.some(x => x.id === fromId) || !pool.some(x => x.id === toId)) return prev;
      const exists = prev.links.some(
        l =>
          l.kind === kind &&
          ((l.fromId === fromId && l.toId === toId) || (l.fromId === toId && l.toId === fromId))
      );
      if (exists) return prev;
      ok = true;
      const link: GraftLink = { id: id(), kind, fromId, toId, label, createdAt: Date.now() };
      return { ...prev, links: [...prev.links, link] };
    });
    return ok ? true : null;
  }, []);

  const deleteLink = useCallback((linkId: string) => {
    setStore(prev => ({ ...prev, links: prev.links.filter(l => l.id !== linkId) }));
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grass-snake-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const importData = useCallback((file: File): Promise<{ success: boolean; count: number; error?: string }> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(String(e.target?.result)) as unknown;
          if (!isSimpleStore(parsed)) throw new Error('请导入本工具导出的 JSON');
          const next =
            (parsed as SimpleStore).version === 4
              ? finalizeStore(parsed as SimpleStore)
              : migrateFromV3(parsed as SimpleStore);
          setStore(next);
          resolve({ success: true, count: next.clues.length + next.values.length });
        } catch (err) {
          resolve({ success: false, count: 0, error: (err as Error).message });
        }
      };
      reader.onerror = () => resolve({ success: false, count: 0, error: '读取失败' });
      reader.readAsText(file);
    });
  }, []);

  const replaceStore = useCallback((next: SimpleStore) => {
    const normalized =
      next.version === 4 ? finalizeStore(next) : migrateFromV3(next as unknown as SimpleStore);
    setStore(normalized);
  }, []);

  const stats = useMemo(
    () => ({
      articles: store.articles.length,
      clues: store.clues.length,
      open: store.clues.filter(c => c.status === 'open').length,
      values: store.values.length,
      links: store.links.length,
    }),
    [store]
  );

  const articleMap = useMemo(() => {
    const m = new Map<string, Article>();
    for (const a of store.articles) m.set(a.id, a);
    return m;
  }, [store.articles]);

  return {
    store,
    articles: store.articles,
    articleMap,
    clues: store.clues,
    values: store.values,
    links: store.links,
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
  };
}
