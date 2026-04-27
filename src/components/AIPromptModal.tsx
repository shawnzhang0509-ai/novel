import { useState, useMemo } from 'react';
import type { Thread } from '@/types/thread';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Check, Sparkles, Wand2 } from 'lucide-react';

interface AIPromptModalProps {
  open: boolean;
  onClose: () => void;
  threads: Thread[];
}

export default function AIPromptModal({ open, onClose, threads }: AIPromptModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [promptType, setPromptType] = useState<'connect' | 'resolve' | 'theme'>('connect');

  const activeThreads = threads.filter(t => t.status !== 'abandoned');

  const toggleId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const promptText = useMemo(() => {
    const selected = activeThreads.filter(t => selectedIds.includes(t.id));
    if (selected.length === 0) return '';

    const lines = selected.map((t, i) => {
      return `${i + 1}. 【${t.title}】\n   - 状态：${t.status === 'buried' ? '已埋下（未回收）' : t.status === 'resolved' ? '已回收' : '待定'}\n   - 章节：埋于 ${t.chapterBuried || '?'}${t.chapterResolved ? `，收于 ${t.chapterResolved}` : t.targetChapter ? `，预计 ${t.targetChapter} 回收` : ''}\n   - 内容：${t.content || '（无详细内容）'}\n   - 关联角色：${t.characters.join('、') || '无'}\n   - 主题标签：${t.tags.join('、') || '无'}\n   - 备注：${t.notes || '无'}`;
    }).join('\n\n');

    if (promptType === 'connect') {
      return `我正在创作一部长篇小说，需要你把以下几条线索串联起来，形成草蛇灰线的呼应关系。这些线索可能分布在不同章节、不同角色身上，请你提供 2-3 种让它们自然交汇的方案，要求：
1. 交汇要有层次感，不能太生硬
2. 要考虑角色动机的一致性
3. 如果有可能，让交汇点同时服务于小说的核心主题

以下是我选中的线索：

${lines}

请用中文回答，给出具体的章节安排建议。`;
    } else if (promptType === 'resolve') {
      return `我正在创作一部长篇小说，以下线索已经埋下但尚未回收。请你帮我想出最精妙的回收方式，要求是：让读者有"恍然大悟"的感觉，但又觉得"早有伏笔"。

未回收线索：

${lines}

请针对每一条给出回收方案，并说明它们之间是否可以合并回收（一石二鸟）。`;
    } else {
      const allTags = Array.from(new Set(selected.flatMap(t => t.tags)));
      return `我正在梳理小说的价值观和主题网络。以下线索带有这些主题标签：${allTags.join('、')}。

请你分析这些线索在主题层面如何形成共振，是否存在张力（价值观冲突）可以被放大。给出 2-3 个建议，让小说的"复杂价值观"通过草蛇灰线的方式自然呈现，而不是说教。

线索详情：

${lines}`;
    }
  }, [activeThreads, selectedIds, promptType]);

  const handleCopy = async () => {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 串联助手
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="shrink-0 py-2">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: 'connect' as const, label: '线索交汇', desc: '让多条线索碰撞' },
                { key: 'resolve' as const, label: '回收方案', desc: '未回收线索怎么收' },
                { key: 'theme' as const, label: '主题共振', desc: '价值观层面串联' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setPromptType(t.key)}
                  className={`flex-shrink-0 text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    promptType === t.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="opacity-80 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="text-xs text-muted-foreground mb-2 shrink-0">
              选择 {selectedIds.length} 条线索（建议选择 2-5 条关联度高的）
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeThreads.map(t => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedIds.includes(t.id) ? 'bg-primary/5 border-primary/40' : 'bg-card border-border'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.includes(t.id)}
                    onCheckedChange={() => toggleId(t.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t.chapterBuried} · {t.characters.slice(0, 2).join('、') || '无角色'}
                    </div>
                  </div>
                </label>
              ))}
              {activeThreads.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  暂无线索，先去埋几个坑吧
                </div>
              )}
            </div>
          </div>

          {promptText && (
            <div className="shrink-0 py-3 border-t mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" />
                  生成的 Prompt
                </span>
                <Button
                  size="sm"
                  variant={copied ? 'default' : 'outline'}
                  className="h-8 text-xs gap-1"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '一键复制'}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                {promptText}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                复制后粘贴到 GPT / Claude / Kimi 等任意 AI 对话中即可
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
