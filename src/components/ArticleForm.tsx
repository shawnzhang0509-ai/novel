import { useEffect, useState } from 'react';
import type { Article } from '@/types/simple';
import { isOpenableUrl, normalizeManuscriptUrl } from '@/lib/url';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Plus, X } from 'lucide-react';

interface ArticleFormProps {
  open: boolean;
  onClose: () => void;
  edit?: Article | null;
  /** 编辑时已有线索名（只展示数量提示；加名用 onAddNames） */
  existingClueCount?: number;
  onCreate: (data: { title: string; sheetUrl: string; clueNames: string[] }) => void;
  onUpdate?: (data: { title: string; sheetUrl: string }) => void;
  onAddNames?: (names: string[]) => void;
}

export default function ArticleForm({
  open,
  onClose,
  edit,
  existingClueCount = 0,
  onCreate,
  onUpdate,
  onAddNames,
}: ArticleFormProps) {
  const [title, setTitle] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [names, setNames] = useState<string[]>(['']);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(edit?.title ?? '');
    setSheetUrl(edit?.sheetUrl ?? '');
    setNames(['']);
    setNameDraft('');
  }, [open, edit]);

  const pushName = (raw: string) => {
    const n = raw.trim();
    if (!n) return;
    setNames(prev => {
      const cleaned = prev.map(x => x.trim()).filter(Boolean);
      if (cleaned.includes(n)) return cleaned.length ? cleaned : [''];
      return [...cleaned, n];
    });
    setNameDraft('');
  };

  const save = () => {
    const url = normalizeManuscriptUrl(sheetUrl);
    const clueNames = [
      ...names.map(n => n.trim()).filter(Boolean),
      ...(nameDraft.trim() ? [nameDraft.trim()] : []),
    ];
    if (edit && onUpdate) {
      onUpdate({ title: title.trim() || '未命名文章', sheetUrl: url });
      if (clueNames.length && onAddNames) onAddNames(clueNames);
      onClose();
      return;
    }
    if (clueNames.length === 0) return;
    onCreate({
      title: title.trim() || '未命名文章',
      sheetUrl: url,
      clueNames,
    });
    onClose();
  };

  const canSave = edit
    ? Boolean(title.trim() || sheetUrl.trim()) || Boolean(nameDraft.trim() || names.some(n => n.trim()))
    : Boolean(nameDraft.trim() || names.some(n => n.trim()));

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2 shrink-0">
          <SheetTitle>{edit ? '编辑文章' : '新文章 + 线索'}</SheetTitle>
          <p className="text-xs text-muted-foreground text-left font-normal leading-relaxed">
            贴一个 Google 链接、写文章标题，再加好几条线索名即可。线索不用写详情；不同文章的线索也能在粒子海里互连。
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Google Sheet / Doc 链接</Label>
            <div className="flex gap-2">
              <Input
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="h-11 text-sm"
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 px-3 shrink-0"
                disabled={!isOpenableUrl(sheetUrl)}
                onClick={() => {
                  const url = normalizeManuscriptUrl(sheetUrl);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">文章标题</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：卷一 · 套娃"
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              线索名（可加多条）
              {edit && existingClueCount > 0 ? (
                <span className="text-muted-foreground font-normal"> · 已有 {existingClueCount} 条</span>
              ) : null}
            </Label>
            <div className="flex gap-2">
              <Input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    pushName(nameDraft);
                  }
                }}
                placeholder="输入线索名，回车添加"
                className="h-11"
              />
              <Button type="button" variant="secondary" className="h-11 px-3" onClick={() => pushName(nameDraft)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {names
                .map(n => n.trim())
                .filter(Boolean)
                .map(n => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-amber-500/35 text-amber-200 bg-amber-500/10"
                  >
                    {n}
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-destructive/20"
                      onClick={() => setNames(prev => prev.filter(x => x.trim() !== n))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground">只要名字。连线去「粒子海」，跨文章也能拖着连。</p>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 pb-6 pt-2 shrink-0 border-t">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1 h-11" disabled={!canSave} onClick={save}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
