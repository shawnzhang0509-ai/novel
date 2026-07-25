import { useEffect, useMemo, useState } from 'react';
import type { Chapter, BrakeMode } from '@/types/novel';
import { brakeHints, brakeLabels } from '@/types/novel';
import {
  buildArchitectureDigest,
  buildChapterCyclePrompt,
  parseCycleReply,
} from '@/lib/cyclePrompt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  ChevronLeft,
  Copy,
  FileText,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Wand2,
} from 'lucide-react';

interface ChapterCyclePanelProps {
  chapters: Chapter[];
  onAddChapter: (title: string, content: string) => string;
  onUpdateChapter: (id: string, updates: Partial<Omit<Chapter, 'id' | 'createdAt'>>) => void;
  onDeleteChapter: (id: string) => void;
  /** 递增时回到「写」步骤 */
  writeNonce?: number;
}

type Step = 1 | 2 | 3;

const brakeColors: Record<BrakeMode, string> = {
  A: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  B: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  C: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  D: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
};

export default function ChapterCyclePanel({
  chapters,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  writeNonce = 0,
}: ChapterCyclePanelProps) {
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id ?? null);
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [gptPaste, setGptPaste] = useState('');
  const [copied, setCopied] = useState(false);

  const chapter = chapters.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    if (writeNonce > 0) {
      setStep(1);
      setTitle('');
      setContent('');
    }
  }, [writeNonce]);

  useEffect(() => {
    const newest = chapters[0];
    if (!newest) return;
    if (!newest.gptRawReply && newest.id !== activeId) {
      setActiveId(newest.id);
      setStep(2);
      setGptPaste('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to newest chapter id
  }, [chapters[0]?.id]);

  const prompt = useMemo(() => {
    if (!chapter) return '';
    return buildChapterCyclePrompt(chapter, buildArchitectureDigest(chapters));
  }, [chapter, chapters]);

  const startWrite = () => {
    if (!content.trim()) return;
    const id = onAddChapter(title, content);
    setActiveId(id);
    setTitle('');
    setContent('');
    setStep(2);
    setGptPaste('');
  };

  const copyPrompt = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ingestGpt = () => {
    if (!chapter || !gptPaste.trim()) return;
    const parsed = parseCycleReply(gptPaste);
    onUpdateChapter(chapter.id, {
      gptRawReply: gptPaste.trim(),
      brakeMode: parsed.brakeMode,
      deconstruct: { ...chapter.deconstruct, ...stripEmpty(parsed.deconstruct) },
      alignment: { ...chapter.alignment, ...stripEmpty(parsed.alignment) },
      architecture: { ...chapter.architecture, ...stripEmpty(parsed.architecture) },
    });
    setStep(3);
  };

  const selectChapter = (id: string) => {
    setActiveId(id);
    const c = chapters.find(x => x.id === id);
    if (!c) return;
    const hasDeconstruct = !!(c.deconstruct.mainlines || c.gptRawReply);
    setStep(hasDeconstruct ? 3 : c.content ? 2 : 1);
    setGptPaste(c.gptRawReply || '');
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="rounded-xl border border-border/80 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
        <div className="text-sm font-semibold tracking-tight">写 → 解构 → 收束 → 再写</div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          用章节反推世界观。你只负责贴正文；解构与对齐用固定 Prompt 交给 GPT，再贴回来自动填表。
        </p>
        <div className="flex gap-2 mt-3">
          {([1, 2, 3] as Step[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex-1 text-[11px] py-2 rounded-lg border transition-colors ${
                step === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/60 border-border text-muted-foreground'
              }`}
            >
              {s === 1 ? '① 写' : s === 2 ? '② 解构' : '③ 收束'}
            </button>
          ))}
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chapters.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectChapter(c.id)}
              className={`shrink-0 max-w-[160px] text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                activeId === c.id
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <div className="font-medium truncate">{c.title}</div>
              <div className="mt-1 flex items-center gap-1">
                {c.brakeMode ? (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${brakeColors[c.brakeMode]}`}>
                    {c.brakeMode}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">未判定</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">章节标题（可不填）</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="第 12 章 · 套娃裂缝"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">本章正文</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="把这一章整段贴进来…"
              className="min-h-[220px] text-sm leading-relaxed"
            />
          </div>
          <Button className="w-full h-11 gap-2" disabled={!content.trim()} onClick={startWrite}>
            <FileText className="w-4 h-4" />
            保存并进入解构
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {!chapter ? (
            <p className="text-sm text-muted-foreground py-8 text-center">先写一章，或从上方选中一章。</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{chapter.title}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    复制 Prompt → 丢给 GPT → 把回复贴回下方
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={copyPrompt}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制 Prompt'}
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-[11px] font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {prompt}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" />
                  粘贴 GPT 回复
                </Label>
                <Textarea
                  value={gptPaste}
                  onChange={e => setGptPaste(e.target.value)}
                  placeholder="把 GPT 按三块结构输出的全文贴这里…"
                  className="min-h-[160px] text-sm font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="h-11" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button className="flex-1 h-11 gap-2" disabled={!gptPaste.trim()} onClick={ingestGpt}>
                  <RefreshCw className="w-4 h-4" />
                  解析并进入收束
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && chapter && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{chapter.title}</div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-destructive"
              onClick={() => {
                if (confirm('删除这一章？')) {
                  onDeleteChapter(chapter.id);
                  setActiveId(chapters.find(c => c.id !== chapter.id)?.id ?? null);
                  setStep(1);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">刹车判定</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B', 'C', 'D'] as BrakeMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateChapter(chapter.id, { brakeMode: mode })}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                    chapter.brakeMode === mode
                      ? brakeColors[mode] + ' border-current'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold">{mode} · {brakeLabels[mode]}</div>
                  <div className="opacity-80 mt-0.5 text-[10px] leading-snug">{brakeHints[mode]}</div>
                </button>
              ))}
            </div>
            {chapter.brakeMode === 'D' && (
              <div className="flex gap-2 items-start rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">哲学漂移刹车已触发</div>
                  <p className="mt-1 opacity-90 leading-relaxed">
                    下一章请强制落地到具体人物、具体后果、具体场景；抽象概念只保留一条服务冲突的规则。
                  </p>
                </div>
              </div>
            )}
          </div>

          <Section
            title="1）文本解构"
            fields={[
              ['主线推进', chapter.deconstruct.mainlines, v => onUpdateChapter(chapter.id, { deconstruct: { ...chapter.deconstruct, mainlines: v } })],
              ['新设定', chapter.deconstruct.newSettings, v => onUpdateChapter(chapter.id, { deconstruct: { ...chapter.deconstruct, newSettings: v } })],
              ['旧设定变体', chapter.deconstruct.settingVariants, v => onUpdateChapter(chapter.id, { deconstruct: { ...chapter.deconstruct, settingVariants: v } })],
              ['哲学层', chapter.deconstruct.philosophyLayer, v => onUpdateChapter(chapter.id, { deconstruct: { ...chapter.deconstruct, philosophyLayer: v } })],
              ['剧情层', chapter.deconstruct.plotLayer, v => onUpdateChapter(chapter.id, { deconstruct: { ...chapter.deconstruct, plotLayer: v } })],
            ]}
          />

          <Section
            title="2）系统对齐"
            fields={[
              ['世界层级', chapter.alignment.worldLayers, v => onUpdateChapter(chapter.id, { alignment: { ...chapter.alignment, worldLayers: v } })],
              ['愿力/业力/吸引力', chapter.alignment.willKarmaAttraction, v => onUpdateChapter(chapter.id, { alignment: { ...chapter.alignment, willKarmaAttraction: v } })],
              ['高我/剧本', chapter.alignment.higherSelfScript, v => onUpdateChapter(chapter.id, { alignment: { ...chapter.alignment, higherSelfScript: v } })],
              ['角色心理', chapter.alignment.characterPsychology, v => onUpdateChapter(chapter.id, { alignment: { ...chapter.alignment, characterPsychology: v } })],
              ['跑偏备注', chapter.alignment.driftNotes, v => onUpdateChapter(chapter.id, { alignment: { ...chapter.alignment, driftNotes: v } })],
            ]}
          />

          <Section
            title="3）架构补丁（只更新必要部分）"
            fields={[
              ['timeline', chapter.architecture.timelineUpdates, v => onUpdateChapter(chapter.id, { architecture: { ...chapter.architecture, timelineUpdates: v } })],
              ['character_state', chapter.architecture.characterStateUpdates, v => onUpdateChapter(chapter.id, { architecture: { ...chapter.architecture, characterStateUpdates: v } })],
              ['new_rules', chapter.architecture.newRules, v => onUpdateChapter(chapter.id, { architecture: { ...chapter.architecture, newRules: v } })],
              ['concept_layers', chapter.architecture.conceptLayers, v => onUpdateChapter(chapter.id, { architecture: { ...chapter.architecture, conceptLayers: v } })],
            ]}
          />

          <Button
            className="w-full h-11"
            onClick={() => {
              setStep(1);
              setContent('');
              setTitle('');
            }}
          >
            收束完成 → 再写下一章
          </Button>
        </div>
      )}

      {step === 3 && !chapter && (
        <p className="text-sm text-muted-foreground py-10 text-center">还没有可收束的章节。</p>
      )}
    </div>
  );
}

function stripEmpty<T extends Record<string, string | undefined>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && String(v).trim()) (out as Record<string, string>)[k] = String(v).trim();
  }
  return out;
}

function Section({
  title,
  fields,
}: {
  title: string;
  fields: [string, string, (v: string) => void][];
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-2.5">
        {fields.map(([label, value, onChange]) => (
          <div key={label} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            <Textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
