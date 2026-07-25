import type { Chapter } from '@/types/novel';
import { brakeLabels } from '@/types/novel';

/** 固定三步解构 prompt：文本解构 → 系统对齐 → 架构更新 + 刹车判定 */
export function buildChapterCyclePrompt(chapter: Chapter, priorSummary?: string): string {
  const prior = priorSummary?.trim()
    ? `\n\n【此前架构摘要（供对照，勿整本重写）】\n${priorSummary.trim()}\n`
    : '';

  return `我正在用「写 → 解构 → 收束 → 再写」的方式创作长篇（套娃 + 多层真相翻转）。请不要做读后感，严格按下面三块输出，用中文，标题保持原样以便我粘贴回工具。

【本章标题】${chapter.title || '（未命名）'}

【本章正文】
${chapter.content}
${prior}
---

## 1）文本解构（发生了什么）
请拆成机器可读要点（短句/bullet）：
- 主线推进：（这一章推进了哪条主线）
- 新设定：（新出现了什么设定）
- 旧设定变体：（哪些是旧设定的变体）
- 哲学层：（哪些信息是哲学层，不是剧情层）
- 剧情层：（哪些是可感知的剧情信息）

## 2）系统对齐（是否跑偏）
对照我的系统检查：
- 世界层级：（物理 / 系统 / 元层有没有混乱）
- 愿力业力吸引力：（有没有重复定义或互相打架）
- 高我与剧本：（有没有跨层混用）
- 角色心理模型：（行为是否符合既定心理模型）
- 跑偏备注：（若无写「无」）

## 3）架构更新（只更新必要部分）
不要重写世界观，只给补丁：
- timeline：（时间线增量）
- character_state：（角色状态增量）
- new_rules：（若真需要才补 1-2 条规则，否则写「无」）
- concept_layers：（新增概念属于哪一层）

## 刹车判定（必选其一）
在最后单独一行输出：
BRAKE: A 或 BRAKE: B 或 BRAKE: C 或 BRAKE: D

含义：
- A：${brakeLabels.A}
- B：${brakeLabels.B}
- C：${brakeLabels.C}
- D：${brakeLabels.D}

若判定为 D，请额外给出「收束动作」：下一章必须落地到哪个具体人物/冲突/场景，把抽象拉回叙事锚点。`;
}

/** 粗解析 GPT 回复里的 BRAKE 与常见小节 */
export function parseCycleReply(raw: string): {
  brakeMode: 'A' | 'B' | 'C' | 'D' | null;
  deconstruct: Partial<{
    mainlines: string;
    newSettings: string;
    settingVariants: string;
    philosophyLayer: string;
    plotLayer: string;
  }>;
  alignment: Partial<{
    worldLayers: string;
    willKarmaAttraction: string;
    higherSelfScript: string;
    characterPsychology: string;
    driftNotes: string;
  }>;
  architecture: Partial<{
    timelineUpdates: string;
    characterStateUpdates: string;
    newRules: string;
    conceptLayers: string;
  }>;
} {
  const brakeMatch = raw.match(/BRAKE:\s*([ABCD])/i);
  const brakeMode = (brakeMatch?.[1]?.toUpperCase() as 'A' | 'B' | 'C' | 'D' | undefined) ?? null;

  const grab = (patterns: RegExp[]): string => {
    for (const re of patterns) {
      const m = raw.match(re);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return '';
  };

  const line = (label: string) =>
    new RegExp(`${label}[：:]\\s*([^\\n]+(?:\\n(?![\\-#*]|主线|新设定|旧设定|哲学|剧情|世界|愿力|高我|角色|跑偏|timeline|character|new_rules|concept)[^\\n]+)*)`, 'i');

  return {
    brakeMode,
    deconstruct: {
      mainlines: grab([line('主线推进'), /主线推进[：:]\s*(.+)/i]),
      newSettings: grab([line('新设定'), /新设定[：:]\s*(.+)/i]),
      settingVariants: grab([line('旧设定变体'), /旧设定变体[：:]\s*(.+)/i]),
      philosophyLayer: grab([line('哲学层'), /哲学层[：:]\s*(.+)/i]),
      plotLayer: grab([line('剧情层'), /剧情层[：:]\s*(.+)/i]),
    },
    alignment: {
      worldLayers: grab([line('世界层级'), /世界层级[：:]\s*(.+)/i]),
      willKarmaAttraction: grab([line('愿力业力吸引力'), /愿力[^\n：:]*[：:]\s*(.+)/i]),
      higherSelfScript: grab([line('高我与剧本'), /高我[^\n：:]*[：:]\s*(.+)/i]),
      characterPsychology: grab([line('角色心理模型'), /角色心理[^\n：:]*[：:]\s*(.+)/i]),
      driftNotes: grab([line('跑偏备注'), /跑偏备注[：:]\s*(.+)/i]),
    },
    architecture: {
      timelineUpdates: grab([/timeline[：:]\s*(.+)/i, line('时间线')]),
      characterStateUpdates: grab([/character_state[：:]\s*(.+)/i, line('角色状态')]),
      newRules: grab([/new_rules[：:]\s*(.+)/i, line('新规则')]),
      conceptLayers: grab([/concept_layers[：:]\s*(.+)/i, line('概念层级'), /新增概念[^\n：:]*[：:]\s*(.+)/i]),
    },
  };
}

export function buildArchitectureDigest(chapters: Chapter[], max = 8): string {
  const recent = [...chapters]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(c => c.architecture.timelineUpdates || c.architecture.newRules || c.architecture.characterStateUpdates)
    .slice(0, max);

  if (recent.length === 0) return '';

  return recent
    .map(c => {
      const bits = [
        c.architecture.timelineUpdates && `时间线：${c.architecture.timelineUpdates}`,
        c.architecture.characterStateUpdates && `角色：${c.architecture.characterStateUpdates}`,
        c.architecture.newRules && c.architecture.newRules !== '无' && `规则：${c.architecture.newRules}`,
        c.architecture.conceptLayers && `层级：${c.architecture.conceptLayers}`,
        c.brakeMode && `刹车：${c.brakeMode}`,
      ].filter(Boolean);
      return `· ${c.title}\n  ${bits.join('\n  ')}`;
    })
    .join('\n');
}
