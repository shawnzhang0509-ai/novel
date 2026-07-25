import type { Thread } from './thread';

/** 章节刹车：防止哲学层漂移失锚 */
export type BrakeMode = 'A' | 'B' | 'C' | 'D';

export const brakeLabels: Record<BrakeMode, string> = {
  A: '推进剧情',
  B: '扩展世界规则',
  C: '提升抽象层级',
  D: '纯哲学漂移（需收束）',
};

export const brakeHints: Record<BrakeMode, string> = {
  A: '以事件与人物行动为锚，规则只服务当下冲突。',
  B: '可补规则，但要用场景演示，勿空讲概念。',
  C: '抽象上升可以，必须留下可感的叙事锚点。',
  D: '危险区：立刻收束到具体人物、具体后果、具体章节任务。',
};

export interface ChapterDeconstruct {
  /** 这一章推进了哪条主线 */
  mainlines: string;
  /** 新出现了什么设定 */
  newSettings: string;
  /** 哪些是旧设定的变体 */
  settingVariants: string;
  /** 哲学层信息（非剧情） */
  philosophyLayer: string;
  /** 剧情层信息 */
  plotLayer: string;
}

export interface SystemAlignment {
  /** 世界层级：物理 / 系统 / 元层 */
  worldLayers: string;
  /** 愿力 / 业力 / 吸引力法则是否重复定义 */
  willKarmaAttraction: string;
  /** 高我 / 剧本是否跨层混用 */
  higherSelfScript: string;
  /** 角色是否符合心理模型 */
  characterPsychology: string;
  /** 跑偏备注 */
  driftNotes: string;
}

export interface ArchitecturePatch {
  timelineUpdates: string;
  characterStateUpdates: string;
  newRules: string;
  /** 新增概念属于哪一层 */
  conceptLayers: string;
}

export const emptyDeconstruct = (): ChapterDeconstruct => ({
  mainlines: '',
  newSettings: '',
  settingVariants: '',
  philosophyLayer: '',
  plotLayer: '',
});

export const emptyAlignment = (): SystemAlignment => ({
  worldLayers: '',
  willKarmaAttraction: '',
  higherSelfScript: '',
  characterPsychology: '',
  driftNotes: '',
});

export const emptyArchitecture = (): ArchitecturePatch => ({
  timelineUpdates: '',
  characterStateUpdates: '',
  newRules: '',
  conceptLayers: '',
});

export interface Chapter {
  id: string;
  title: string;
  content: string;
  brakeMode: BrakeMode | null;
  deconstruct: ChapterDeconstruct;
  alignment: SystemAlignment;
  architecture: ArchitecturePatch;
  /** GPT 整段回复备份 */
  gptRawReply: string;
  createdAt: number;
  updatedAt: number;
}

/** 灵感/章节节点之间的草蛇灰线嫁接 */
export type NodeKind = 'chapter' | 'thread';

export interface GraftLink {
  id: string;
  fromId: string;
  toId: string;
  fromKind: NodeKind;
  toKind: NodeKind;
  /** 嫁接说明：为何相连、呼应点 */
  label: string;
  createdAt: number;
}

export interface NovelStore {
  version: 2;
  threads: Thread[];
  chapters: Chapter[];
  links: GraftLink[];
}

export function isNovelStore(raw: unknown): raw is NovelStore {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return o.version === 2 && Array.isArray(o.threads) && Array.isArray(o.chapters) && Array.isArray(o.links);
}
