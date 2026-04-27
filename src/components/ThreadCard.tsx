import type { Thread } from '@/types/thread';
import { statusLabels, statusColors } from '@/types/thread';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Users, Tag, CheckCircle2, XCircle, HelpCircle, Timer } from 'lucide-react';

interface ThreadCardProps {
  thread: Thread;
  onClick: (thread: Thread) => void;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const statusIcons = {
  buried: Timer,
  resolved: CheckCircle2,
  abandoned: XCircle,
  pending: HelpCircle,
};

export default function ThreadCard({ thread, onClick, isSelected, onSelectToggle }: ThreadCardProps) {
  const StatusIcon = statusIcons[thread.status];

  return (
    <Card
      className={`relative mb-3 cursor-pointer transition-all active:scale-[0.98] border-l-4 ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
      } ${
        thread.status === 'buried' ? 'border-l-amber-500' :
        thread.status === 'resolved' ? 'border-l-emerald-500' :
        thread.status === 'abandoned' ? 'border-l-slate-500' :
        'border-l-violet-500'
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.select-box')) return;
        onClick(thread);
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {onSelectToggle && (
            <div className="select-box pt-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectToggle(thread.id);
                }}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-transparent'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-semibold text-sm leading-tight truncate pr-2">{thread.title}</h3>
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${statusColors[thread.status]}`}>
                <StatusIcon className="w-3 h-3" />
                {statusLabels[thread.status]}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
              {thread.content}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
              {thread.chapterBuried && (
                <span className="flex items-center gap-1">
                  <ScrollText className="w-3 h-3" />
                  埋于{thread.chapterBuried}
                </span>
              )}
              {thread.chapterResolved && thread.status === 'resolved' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  收于{thread.chapterResolved}
                </span>
              )}
              {thread.targetChapter && thread.status !== 'resolved' && (
                <span className="flex items-center gap-1 text-amber-400/80">
                  <Timer className="w-3 h-3" />
                  预计{thread.targetChapter}回收
                </span>
              )}
            </div>

            {(thread.characters.length > 0 || thread.tags.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {thread.characters.map((c) => (
                  <span key={c} className="inline-flex items-center gap-0.5 text-[10px] bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded">
                    <Users className="w-2.5 h-2.5" />
                    {c}
                  </span>
                ))}
                {thread.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    <Tag className="w-2.5 h-2.5" />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
