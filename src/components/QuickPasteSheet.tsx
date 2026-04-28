import { useState } from 'react';
import type { Thread } from '@/types/thread';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { splitByChapterHeadings, guessTitleFromFirstLine } from '@/lib/chapterSplit';
import { FileText, MessageSquare } from 'lucide-react';

type PasteKind = 'chapter' | 'gpt';

interface QuickPasteSheetProps {
  open: boolean;
  onClose: () => void;
  onSaveMany: (items: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

const TAG_CHAPTER = '章节存档';
const TAG_GPT = 'GPT对话';

export default function QuickPasteSheet({ open, onClose, onSaveMany }: QuickPasteSheetProps) {
  const [kind, setKind] = useState<PasteKind>('chapter');
  const [raw, setRaw] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [chapterHint, setChapterHint] = useState('');
  const [splitChapters, setSplitChapters] = useState(false);
  const [gptLink, setGptLink] = useState('');

  const reset = () => {
    setRaw('');
    setManualTitle('');
    setChapterHint('');
    setSplitChapters(false);
    setKind('chapter');
    setGptLink('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildItems = (): Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const text = raw.trim();
    if (!text) return [];

    const tag = kind === 'chapter' ? TAG_CHAPTER : TAG_GPT;
    const linkLine = kind === 'gpt' && gptLink.trim() ? `链接：${gptLink.trim()}\n` : '';
    const baseNotes =
      kind === 'gpt'
        ? `${linkLine}来源：粘贴的 GPT 对话备份。`
        : '来源：粘贴的章节正文存档。';

    if (kind === 'chapter' && splitChapters) {
      const parts = splitByChapterHeadings(text);
      if (parts.length > 1) {
        return parts.map((p, i) => {
          const title = p.title || `第 ${i + 1} 段`;
          return {
            title: title.length > 120 ? `${title.slice(0, 117)}…` : title,
            content: p.content,
            chapterBuried: chapterHint.trim() || title.slice(0, 32),
            chapterResolved: '',
            status: 'buried' as const,
            characters: [] as string[],
            tags: [tag],
            targetChapter: '',
            notes: baseNotes,
          };
        });
      }
    }

    const userTitle = manualTitle.trim();
    const firstLineTitle = kind === 'chapter' ? guessTitleFromFirstLine(text) : '';
    let title = userTitle || firstLineTitle;
    let content = text;

    if (!userTitle && firstLineTitle && kind === 'chapter') {
      const rest = text.replace(/\r\n/g, '\n').trimStart();
      const afterFirst = rest.slice(firstLineTitle.length).replace(/^\n+/, '');
      if (afterFirst.trim()) content = afterFirst.trim();
    }

    if (!title) {
      const prefix = kind === 'chapter' ? '章节粘贴' : 'GPT 摘录';
      title = `${prefix} · ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }

    return [
      {
        title: title.length > 120 ? `${title.slice(0, 117)}…` : title,
        content,
        chapterBuried: chapterHint.trim() || (kind === 'chapter' ? '（未标章节号）' : ''),
        chapterResolved: '',
        status: 'buried' as const,
        characters: [] as string[],
        tags: [tag],
        targetChapter: '',
        notes: baseNotes,
      },
    ];
  };

  const handleSave = () => {
    const items = buildItems();
    if (items.length === 0) return;
    onSaveMany(items);
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="h-[92dvh] sm:h-[88dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2 shrink-0">
          <SheetTitle>粘贴存档</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal text-left">
            把整章或整段 GPT 对话贴进下面大框，点保存即可；可选按「第×章」自动拆成多条。
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind('chapter')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                kind === 'chapter'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              小说章节
            </button>
            <button
              type="button"
              onClick={() => setKind('gpt')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                kind === 'gpt'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              GPT 对话
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">正文（整段粘贴）</Label>
            <Textarea
              placeholder={
                kind === 'chapter'
                  ? '此处粘贴整章正文…\n若第一行是简短标题，会尽量当作线索标题；其余进正文。'
                  : '此处粘贴与 GPT 的整段对话（含链接可复制到备注里另存）…'
              }
              value={raw}
              onChange={e => setRaw(e.target.value)}
              className="min-h-[200px] text-sm font-mono leading-relaxed"
            />
          </div>

          {kind === 'chapter' && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer">
              <Checkbox
                checked={splitChapters}
                onCheckedChange={v => setSplitChapters(v === true)}
                className="mt-0.5"
              />
              <div className="text-sm leading-snug">
                <div className="font-medium">按章节标题拆成多条</div>
                <div className="text-xs text-muted-foreground mt-1">
                  识别以「第×章」「Chapter 1」等单独成行开头的段落；识别不到则仍为一条。
                </div>
              </div>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">线索标题（可不填）</Label>
              <Input
                placeholder="不填则：章节用首行或时间戳；GPT 用时间戳"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                className="h-10"
              />
            </div>
            {kind === 'chapter' && (
              <div className="space-y-1.5">
                <Label className="text-xs">章节备注（可选）</Label>
                <Input
                  placeholder="如：第5章、卷二-3"
                  value={chapterHint}
                  onChange={e => setChapterHint(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
          </div>

          {kind === 'gpt' && (
            <div className="space-y-1.5">
              <Label className="text-xs">对话链接（可选，贴在备注里）</Label>
              <Input
                placeholder="https://..."
                value={gptLink}
                onChange={e => setGptLink(e.target.value)}
                className="h-10"
                inputMode="url"
              />
            </div>
          )}
        </div>

        <SheetFooter className="pb-6 pt-2 shrink-0 flex-row gap-2 border-t">
          <Button variant="outline" className="flex-1 h-11" onClick={handleClose}>
            取消
          </Button>
          <Button className="flex-1 h-11" onClick={handleSave} disabled={!raw.trim()}>
            保存 {kind === 'chapter' && splitChapters ? '（可多条）' : '为线索'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
