import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Clue, GraftLink, ParticleKind, SimpleStore, ValueItem } from '@/types/simple';
import { isGoogleDocLink, isSimpleStore, normalizeClue } from '@/types/simple';

const STORAGE_KEY = 'snake-simple-v3';
const V2_KEY = 'snake-novel-v2';
const V1_KEY = 'snake-threads-v1';

function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function empty(): SimpleStore {
  return { version: 3, sheetUrl: '', clues: [], values: [], links: [] };
}

function finalizeStore(store: SimpleStore): SimpleStore {
  let sheetUrl = store.sheetUrl.trim();
  const clues = store.clues.map(c => {
    const note = typeof (c as Clue).note === 'string' ? (c as Clue).note : '';
    if (!sheetUrl && isGoogleDocLink(note)) {
      sheetUrl = note.trim();
    }
    // also salvage google link stuck in detail by mistake
    const detail = typeof (c as Clue & { detail?: string }).detail === 'string'
      ? (c as Clue).detail
      : '';
    if (!sheetUrl && isGoogleDocLink(detail)) {
      sheetUrl = detail.trim();
    }
    return normalizeClue(c as Clue);
  });
  return { ...store, sheetUrl, clues };
}

function migrate(): SimpleStore {
  try {
    const v3 = localStorage.getItem(STORAGE_KEY);
    if (v3) {
      const parsed = JSON.parse(v3) as unknown;
      if (isSimpleStore(parsed)) return finalizeStore(parsed);
    }
  } catch {
    /* continue */
  }

  const store = empty();
  try {
    const v2raw = localStorage.getItem(V2_KEY);
    if (v2raw) {
      const v2 = JSON.parse(v2raw) as {
        threads?: { id: string; title: string; content?: string; notes?: string; status?: string; tags?: string[]; createdAt?: number; updatedAt?: number }[];
        links?: { id: string; fromId: string; toId: string; fromKind?: string; toKind?: string; label?: string; createdAt?: number }[];
      };
      if (Array.isArray(v2.threads)) {
        for (const t of v2.threads) {
          const isValue = (t.tags || []).some(tag => /价值|主题|观/.test(tag));
          if (isValue) {
            store.values.push({
              id: t.id,
              title: t.title,
              note: t.content || t.notes || '',
              createdAt: t.createdAt || Date.now(),
              updatedAt: t.updatedAt || Date.now(),
            });
          } else {
            store.clues.push(
              normalizeClue({
                id: t.id,
                title: t.title,
                note: t.content || t.notes || '',
                detail: '',
                status: t.status === 'resolved' ? 'done' : 'open',
                createdAt: t.createdAt || Date.now(),
                updatedAt: t.updatedAt || Date.now(),
              })
            );
          }
        }
      }
      if (Array.isArray(v2.links)) {
        for (const l of v2.links) {
          const fromClue = store.clues.some(c => c.id === l.fromId);
          const toClue = store.clues.some(c => c.id === l.toId);
          const fromVal = store.values.some(v => v.id === l.fromId);
          const toVal = store.values.some(v => v.id === l.toId);
          if (fromClue && toClue) {
            store.links.push({
              id: l.id,
              kind: 'clue',
              fromId: l.fromId,
              toId: l.toId,
              label: l.label || '',
              createdAt: l.createdAt || Date.now(),
            });
          } else if (fromVal && toVal) {
            store.links.push({
              id: l.id,
              kind: 'value',
              fromId: l.fromId,
              toId: l.toId,
              label: l.label || '',
              createdAt: l.createdAt || Date.now(),
            });
          }
        }
      }
      return finalizeStore(store);
    }
  } catch {
    /* continue */
  }

  try {
    const v1raw = localStorage.getItem(V1_KEY);
    if (v1raw) {
      const threads = JSON.parse(v1raw) as {
        id: string;
        title: string;
        content?: string;
        notes?: string;
        status?: string;
        createdAt?: number;
        updatedAt?: number;
      }[];
      if (Array.isArray(threads)) {
        store.clues = threads.map(t =>
          normalizeClue({
            id: t.id,
            title: t.title,
            note: t.content || t.notes || '',
            detail: '',
            status: t.status === 'resolved' ? 'done' : 'open',
            createdAt: t.createdAt || Date.now(),
            updatedAt: t.updatedAt || Date.now(),
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

  const setSheetUrl = useCallback((sheetUrl: string) => {
    setStore(prev => ({ ...prev, sheetUrl }));
  }, []);

  const addClue = useCallback((partial: Pick<Clue, 'title' | 'detail' | 'note' | 'status'>) => {
    const now = Date.now();
    const clue = normalizeClue({ ...partial, id: id(), createdAt: now, updatedAt: now });
    setStore(prev => ({ ...prev, clues: [clue, ...prev.clues] }));
    return clue.id;
  }, []);

  const updateClue = useCallback(
    (cid: string, updates: Partial<Pick<Clue, 'title' | 'detail' | 'note' | 'status'>>) => {
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
          if (!isSimpleStore(parsed)) throw new Error('请导入本工具导出的 v3 JSON');
          setStore(finalizeStore(parsed));
          resolve({ success: true, count: parsed.clues.length + parsed.values.length });
        } catch (err) {
          resolve({ success: false, count: 0, error: (err as Error).message });
        }
      };
      reader.onerror = () => resolve({ success: false, count: 0, error: '读取失败' });
      reader.readAsText(file);
    });
  }, []);

  const replaceStore = useCallback((next: SimpleStore) => {
    setStore(finalizeStore(next));
  }, []);

  const stats = useMemo(
    () => ({
      clues: store.clues.length,
      open: store.clues.filter(c => c.status === 'open').length,
      values: store.values.length,
      links: store.links.length,
    }),
    [store]
  );

  return {
    store,
    sheetUrl: store.sheetUrl,
    clues: store.clues,
    values: store.values,
    links: store.links,
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
    replaceStore,
  };
}
