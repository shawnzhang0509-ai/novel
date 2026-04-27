import { useState, useEffect, useCallback } from 'react';
import type { Thread } from '@/types/thread';

const STORAGE_KEY = 'snake-threads-v1';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: Thread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>(loadThreads);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const addThread = useCallback((partial: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newThread: Thread = {
      ...partial,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setThreads(prev => [newThread, ...prev]);
    return newThread.id;
  }, []);

  const updateThread = useCallback((id: string, updates: Partial<Omit<Thread, 'id' | 'createdAt'>>) => {
    setThreads(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      )
    );
  }, []);

  const deleteThread = useCallback((id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
  }, []);

  const reorderThreads = useCallback((newOrder: Thread[]) => {
    setThreads(newOrder);
  }, []);

  const exportData = useCallback(() => {
    const data = JSON.stringify(threads, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threads-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [threads]);

  const importData = useCallback((file: File): Promise<{ success: boolean; count: number; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as Thread[];
          if (!Array.isArray(parsed)) throw new Error('Invalid format');
          setThreads(parsed);
          resolve({ success: true, count: parsed.length });
        } catch (err) {
          resolve({ success: false, count: 0, error: (err as Error).message });
        }
      };
      reader.onerror = () => resolve({ success: false, count: 0, error: 'Read failed' });
      reader.readAsText(file);
    });
  }, []);

  const stats = {
    total: threads.length,
    buried: threads.filter(t => t.status === 'buried').length,
    resolved: threads.filter(t => t.status === 'resolved').length,
    abandoned: threads.filter(t => t.status === 'abandoned').length,
    pending: threads.filter(t => t.status === 'pending').length,
  };

  return {
    threads,
    stats,
    addThread,
    updateThread,
    deleteThread,
    reorderThreads,
    exportData,
    importData,
  };
}
