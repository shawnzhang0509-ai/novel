import { useEffect, useState } from 'react';
import type { Clue, ClueStatus } from '@/types/simple';
import { clueStatusLabel } from '@/types/simple';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ClueFormProps {
  open: boolean;
  onClose: () => void;
  edit?: Clue | null;
  sheetUrl?: string;
  onSave: (data: Pick<Clue, 'title' | 'detail' | 'note' | 'status'>) => void;
}

export default function ClueForm({ open, onClose, edit, sheetUrl, onSave }: ClueFormProps) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<ClueStatus>('open');

  useEffect(() => {
    if (!open) return;
    setTitle(edit?.title ?? '');
    setDetail(edit?.detail ?? '');
    setNote(edit?.note ?? '');
    setStatus(edit?.status ?? 'open');
  }, [open, edit]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2 shrink-0">
          <SheetTitle>{edit ? '编辑线索 A' : '新线索 A'}</SheetTitle>
          <p className="text-xs text-muted-foreground text-left font-normal leading-relaxed">
            顶部那一个 Google 链接 = 整篇文章；下面可以挂很多条线索。详情写在这里，不要把链接塞进备注。
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {sheetUrl ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground break-all">
              正文链接：{sheetUrl}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
              还没贴正文链接。先在首页顶部粘贴 Google Sheet / Doc，多条线索共用它。
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">标题</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：墙上歪掉的画"
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">线索详情</Label>
            <Textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="埋了什么、读者看到什么、打算怎么收、和谁有关……尽管写。"
              className="min-h-[180px] text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">短备注（可选）</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例如：第 3 章埋 / 别太早揭"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">状态</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['open', 'done'] as ClueStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`h-11 rounded-lg border text-sm transition-colors ${
                    status === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {clueStatusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 pb-6 pt-2 shrink-0 border-t">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 h-11"
            disabled={!title.trim()}
            onClick={() => {
              onSave({
                title: title.trim(),
                detail: detail.trim(),
                note: note.trim(),
                status,
              });
              onClose();
            }}
          >
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
