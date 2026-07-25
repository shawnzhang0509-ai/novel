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
  onSave: (data: Pick<Clue, 'title' | 'note' | 'status'>) => void;
}

export default function ClueForm({ open, onClose, edit, onSave }: ClueFormProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<ClueStatus>('open');

  useEffect(() => {
    if (!open) return;
    setTitle(edit?.title ?? '');
    setNote(edit?.note ?? '');
    setStatus(edit?.status ?? 'open');
  }, [open, edit]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2">
          <SheetTitle>{edit ? '编辑线索 A' : '新线索 A'}</SheetTitle>
          <p className="text-xs text-muted-foreground text-left font-normal">
            只记「埋了什么」就够。正文写在 Google Sheet 里。
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
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
            <Label className="text-xs">一句话备注（可选）</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="读者看到了什么 / 打算怎么收…"
              rows={3}
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

        <SheetFooter className="flex-row gap-2 pb-6 pt-2">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 h-11"
            disabled={!title.trim()}
            onClick={() => {
              onSave({ title: title.trim(), note: note.trim(), status });
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
