import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Thread } from '@/types/thread';
import type { Chapter, GraftLink, NovelStore, BrakeMode } from '@/types/novel';
import {
  emptyAlignment,
  emptyArchitecture,
  emptyDeconstruct,
  isNovelStore,
} from '@/types/novel';

const STORAGE_KEY = 'snake-novel-v2';
const LEGACY_KEY = 'snake-threads-v1';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadStore(): NovelStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isNovelStore(parsed)) return parsed;
    }
  } catch {
    /* fall through */
  }

  // migrate v1 threads-only
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const threads = JSON.parse(legacy) as Thread[];
      if (Array.isArray(threads)) {
        return { version: 2, threads, chapters: [], links: [] };
      }
    }
  } catch {
    /* ignore */
  }

  return { version: 2, threads: [], chapters: [], links: [] };
}

function saveStore(store: NovelStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useNovelStore() {
  const [store, setStore] = useState<NovelStore>(loadStore);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const threads = store.threads;
  const chapters = store.chapters;
  const links = store.links;

  const addThread = useCallback((partial: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newThread: Thread = { ...partial, id: generateId(), createdAt: now, updatedAt: now };
    setStore(prev => ({ ...prev, threads: [newThread, ...prev.threads] }));
    return newThread.id;
  }, []);

  const addThreads = useCallback((partials: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    if (partials.length === 0) return;
    const now = Date.now();
    const newOnes = partials.map(p => ({ ...p, id: generateId(), createdAt: now, updatedAt: now }));
    setStore(prev => ({ ...prev, threads: [...newOnes, ...prev.threads] }));
  }, []);

  const updateThread = useCallback((id: string, updates: Partial<Omit<Thread, 'id' | 'createdAt'>>) => {
    setStore(prev => ({
      ...prev,
      threads: prev.threads.map(t => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)),
    }));
  }, []);

  const deleteThread = useCallback((id: string) => {
    setStore(prev => ({
      ...prev,
      threads: prev.threads.filter(t => t.id !== id),
      links: prev.links.filter(l => !(l.fromId === id || l.toId === id)),
    }));
  }, []);

  const addChapter = useCallback((title: string, content: string) => {
    const now = Date.now();
    const chapter: Chapter = {
      id: generateId(),
      title: title.trim() || `章节 · ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      content: content.trim(),
      brakeMode: null,
      deconstruct: emptyDeconstruct(),
      alignment: emptyAlignment(),
      architecture: emptyArchitecture(),
      gptRawReply: '',
      createdAt: now,
      updatedAt: now,
    };
    setStore(prev => ({ ...prev, chapters: [chapter, ...prev.chapters] }));
    return chapter.id;
  }, []);

  const updateChapter = useCallback((id: string, updates: Partial<Omit<Chapter, 'id' | 'createdAt'>>) => {
    setStore(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
    }));
  }, []);

  const deleteChapter = useCallback((id: string) => {
    setStore(prev => ({
      ...prev,
      chapters: prev.chapters.filter(c => c.id !== id),
      links: prev.links.filter(l => !(l.fromId === id || l.toId === id)),
    }));
  }, []);

  const setBrakeMode = useCallback((id: string, brakeMode: BrakeMode) => {
    updateChapter(id, { brakeMode });
  }, [updateChapter]);

  const addLink = useCallback((link: Omit<GraftLink, 'id' | 'createdAt'>) => {
    if (link.fromId === link.toId) return null;
    const exists = store.links.some(
      l =>
        (l.fromId === link.fromId && l.toId === link.toId) ||
        (l.fromId === link.toId && l.toId === link.fromId)
    );
    if (exists) return null;
    const newLink: GraftLink = { ...link, id: generateId(), createdAt: Date.now() };
    setStore(prev => ({ ...prev, links: [...prev.links, newLink] }));
    return newLink.id;
  }, [store.links]);

  const updateLink = useCallback((id: string, updates: Partial<Pick<GraftLink, 'label'>>) => {
    setStore(prev => ({
      ...prev,
      links: prev.links.map(l => (l.id === id ? { ...l, ...updates } : l)),
    }));
  }, []);

  const deleteLink = useCallback((id: string) => {
    setStore(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }));
  }, []);

  const exportData = useCallback(() => {
    const data = JSON.stringify(store, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel-store-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const importData = useCallback((file: File): Promise<{ success: boolean; count: number; error?: string }> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as unknown;
          if (isNovelStore(parsed)) {
            setStore(parsed);
            resolve({
              success: true,
              count: parsed.threads.length + parsed.chapters.length,
            });
            return;
          }
          // accept legacy thread arrays
          if (Array.isArray(parsed)) {
            setStore({ version: 2, threads: parsed as Thread[], chapters: [], links: [] });
            resolve({ success: true, count: (parsed as Thread[]).length });
            return;
          }
          throw new Error('无法识别的备份格式');
        } catch (err) {
          resolve({ success: false, count: 0, error: (err as Error).message });
        }
      };
      reader.onerror = () => resolve({ success: false, count: 0, error: 'Read failed' });
      reader.readAsText(file);
    });
  }, []);

  const stats = useMemo(() => {
    const threadStats = {
      total: threads.length,
      buried: threads.filter(t => t.status === 'buried').length,
      resolved: threads.filter(t => t.status === 'resolved').length,
      abandoned: threads.filter(t => t.status === 'abandoned').length,
      pending: threads.filter(t => t.status === 'pending').length,
    };
    return {
      ...threadStats,
      chapters: chapters.length,
      links: links.length,
      driftD: chapters.filter(c => c.brakeMode === 'D').length,
    };
  }, [threads, chapters, links]);

  return {
    threads,
    chapters,
    links,
    stats,
    addThread,
    addThreads,
    updateThread,
    deleteThread,
    addChapter,
    updateChapter,
    deleteChapter,
    setBrakeMode,
    addLink,
    updateLink,
    deleteLink,
    exportData,
    importData,
  };
}
