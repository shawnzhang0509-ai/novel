import { useEffect, useState } from 'react';
import type { ValueItem } from '@/types/simple';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ValueFormProps {
  open: boolean;
  onClose: () => void;
  edit?: ValueItem | null;
  onSave: (data: Pick<ValueItem, 'title' | 'note'>) => void;
}

export default function ValueForm({ open, onClose, edit, onSave }: ValueFormProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(edit?.title ?? '');
    setNote(edit?.note ?? '');
  }, [open, edit]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2">
          <SheetTitle>{edit ? '编辑价值观 B' : '新价值观 B'}</SheetTitle>
          <p className="text-xs text-muted-foreground text-left font-normal">
            主题 / 立场 / 张力。只写名字和一句说明。
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">名称</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：正义的代价"
              className="h-11"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">说明（可选）</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="它在故事里怎么拧人…"
              rows={3}
            />
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
              onSave({ title: title.trim(), note: note.trim() });
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
