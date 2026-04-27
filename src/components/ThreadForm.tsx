import { useState, useEffect } from 'react';
import type { Thread, ThreadStatus } from '@/types/thread';
import { statusLabels } from '@/types/thread';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface ThreadFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editThread?: Thread | null;
  allCharacters: string[];
  allTags: string[];
}

const emptyForm = {
  title: '',
  content: '',
  chapterBuried: '',
  chapterResolved: '',
  status: 'buried' as ThreadStatus,
  characters: [] as string[],
  tags: [] as string[],
  targetChapter: '',
  notes: '',
};

export default function ThreadForm({ open, onClose, onSave, editThread, allCharacters, allTags }: ThreadFormProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [charInput, setCharInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editThread) {
      setForm({
        title: editThread.title,
        content: editThread.content,
        chapterBuried: editThread.chapterBuried,
        chapterResolved: editThread.chapterResolved,
        status: editThread.status,
        characters: [...editThread.characters],
        tags: [...editThread.tags],
        targetChapter: editThread.targetChapter,
        notes: editThread.notes,
      });
    } else {
      setForm({ ...emptyForm });
    }
    setCharInput('');
    setTagInput('');
  }, [editThread, open]);

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  const addCharacter = () => {
    const val = charInput.trim();
    if (val && !form.characters.includes(val)) {
      setForm(prev => ({ ...prev, characters: [...prev.characters, val] }));
      setCharInput('');
    }
  };

  const removeCharacter = (c: string) => {
    setForm(prev => ({ ...prev, characters: prev.characters.filter(x => x !== c) }));
  };

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !form.tags.includes(val)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, val] }));
      setTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] sm:h-[85dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2 shrink-0">
          <SheetTitle>{editThread ? '编辑线索' : '新建线索'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">线索标题 *</Label>
            <Input
              placeholder="例如：墙上歪掉的画"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">详细内容</Label>
            <Textarea
              placeholder="这个线索具体是什么？读者看到了什么？"
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">埋下章节</Label>
              <Input
                placeholder="第3章"
                value={form.chapterBuried}
                onChange={e => setForm(prev => ({ ...prev, chapterBuried: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">当前状态</Label>
              <div className="grid grid-cols-2 gap-1">
                {(['buried', 'resolved', 'abandoned', 'pending'] as ThreadStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(prev => ({ ...prev, status: s }))}
                    className={`text-[11px] py-2 px-1 rounded border transition-colors ${
                      form.status === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.status === 'resolved' && (
            <div className="space-y-1.5">
              <Label className="text-xs">回收章节</Label>
              <Input
                placeholder="第15章"
                value={form.chapterResolved}
                onChange={e => setForm(prev => ({ ...prev, chapterResolved: e.target.value }))}
                className="h-10"
              />
            </div>
          )}

          {form.status !== 'resolved' && (
            <div className="space-y-1.5">
              <Label className="text-xs">预期回收章节（可选）</Label>
              <Input
                placeholder="第28章（给自己留个提醒）"
                value={form.targetChapter}
                onChange={e => setForm(prev => ({ ...prev, targetChapter: e.target.value }))}
                className="h-10"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">关联角色</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入角色名"
                value={charInput}
                onChange={e => setCharInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCharacter())}
                className="h-10 flex-1"
                list="char-suggestions"
              />
              <Button size="sm" variant="secondary" className="h-10 px-3" onClick={addCharacter}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <datalist id="char-suggestions">
              {allCharacters.map(c => <option key={c} value={c} />)}
            </datalist>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {form.characters.map(c => (
                <Badge key={c} variant="secondary" className="pl-2 pr-1 py-1 text-xs flex items-center gap-1">
                  {c}
                  <button onClick={() => removeCharacter(c)} className="ml-0.5 p-0.5 rounded hover:bg-destructive/20">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">主题标签 / 价值观</Label>
            <div className="flex gap-2">
              <Input
                placeholder="例如：正义的代价、背叛"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="h-10 flex-1"
                list="tag-suggestions"
              />
              <Button size="sm" variant="secondary" className="h-10 px-3" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <datalist id="tag-suggestions">
              {allTags.map(t => <option key={t} value={t} />)}
            </datalist>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {form.tags.map(t => (
                <Badge key={t} variant="outline" className="pl-2 pr-1 py-1 text-xs flex items-center gap-1 border-primary/30 text-primary">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 p-0.5 rounded hover:bg-destructive/20">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">备注 / 回收想法</Label>
            <Textarea
              placeholder="这里可以写你打算怎么回收这个线索，或者和哪些其他线索串联..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="pb-6 pt-2 shrink-0 flex-row gap-2">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>取消</Button>
          <Button className="flex-1 h-11" onClick={handleSave} disabled={!form.title.trim()}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
