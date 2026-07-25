import { useEffect, useMemo, useRef, useState } from 'react';
import type { Thread } from '@/types/thread';
import type { Chapter, GraftLink, NodeKind } from '@/types/novel';
import { brakeLabels } from '@/types/novel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Unlink, RotateCcw } from 'lucide-react';

interface ParticleSeaProps {
  chapters: Chapter[];
  threads: Thread[];
  links: GraftLink[];
  onAddLink: (link: Omit<GraftLink, 'id' | 'createdAt'>) => string | null;
  onDeleteLink: (id: string) => void;
}

interface SimNode {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hue: number;
  radius: number;
}

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export default function ParticleSea({
  chapters,
  threads,
  links,
  onAddLink,
  onDeleteLink,
}: ParticleSeaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef(links);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<{ id: string; kind: NodeKind } | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const rotRef = useRef({ yaw: 0.35, pitch: 0.25 });
  const dragRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const zoomRef = useRef(1);

  const graphKey = useMemo(
    () =>
      chapters.map(c => c.id).join(',') +
      '|' +
      threads.map(t => t.id).join(',') +
      '|' +
      links.map(l => l.id).join(','),
    [chapters, threads, links]
  );

  linksRef.current = links;

  useEffect(() => {
    const nodes: SimNode[] = [];
    for (const c of chapters) {
      const s = hashSeed(c.id);
      const brakeHue =
        c.brakeMode === 'A' ? 150 :
        c.brakeMode === 'B' ? 200 :
        c.brakeMode === 'C' ? 40 :
        c.brakeMode === 'D' ? 350 : 220;
      nodes.push({
        id: c.id,
        kind: 'chapter',
        title: c.title,
        subtitle: c.brakeMode ? `刹车 ${c.brakeMode} · ${brakeLabels[c.brakeMode]}` : '章节 · 未判定刹车',
        x: (s - 0.5) * 420,
        y: (hashSeed(c.id + 'y') - 0.5) * 320,
        z: (hashSeed(c.id + 'z') - 0.5) * 360,
        vx: 0,
        vy: 0,
        vz: 0,
        hue: brakeHue,
        radius: 7.5,
      });
    }
    for (const t of threads) {
      const s = hashSeed(t.id);
      nodes.push({
        id: t.id,
        kind: 'thread',
        title: t.title,
        subtitle: t.tags.slice(0, 2).join(' · ') || '灵感粒子',
        x: (s - 0.5) * 480,
        y: (hashSeed(t.id + 'y') - 0.5) * 380,
        z: (hashSeed(t.id + 'z') - 0.5) * 420,
        vx: 0,
        vy: 0,
        vz: 0,
        hue: t.tags.includes('GPT对话') ? 280 : t.tags.includes('章节存档') ? 190 : 45,
        radius: 4.2,
      });
    }
    nodesRef.current = nodes;
  }, [graphKey, chapters, threads]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let raf = 0;
    let running = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const project = (n: SimNode, w: number, h: number) => {
      const { yaw, pitch } = rotRef.current;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const x1 = n.x * cy + n.z * sy;
      const z1 = -n.x * sy + n.z * cy;
      const y2 = n.y * cp - z1 * sp;
      const z2 = n.y * sp + z1 * cp;
      const dist = 520 / zoomRef.current;
      const f = dist / (dist + z2 + 280);
      return {
        sx: w / 2 + x1 * f,
        sy: h / 2 + y2 * f,
        scale: f,
        depth: z2,
      };
    };

    const tick = () => {
      if (!running) return;
      const { width, height } = wrap.getBoundingClientRect();
      const nodes = nodesRef.current;
      const edgeList = linksRef.current;

      // soft forces
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.vx += (Math.sin(performance.now() * 0.0003 + i) * 0.012);
        a.vy += (Math.cos(performance.now() * 0.00025 + i * 1.7) * 0.01);
        a.vz += (Math.sin(performance.now() * 0.0002 + i * 0.9) * 0.012);

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const d2 = dx * dx + dy * dy + dz * dz + 40;
          const rep = 900 / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * rep * 0.02;
          a.vy += (dy / d) * rep * 0.02;
          a.vz += (dz / d) * rep * 0.02;
          b.vx -= (dx / d) * rep * 0.02;
          b.vy -= (dy / d) * rep * 0.02;
          b.vz -= (dz / d) * rep * 0.02;
        }
      }

      for (const e of edgeList) {
        const a = nodes.find(n => n.id === e.fromId);
        const b = nodes.find(n => n.id === e.toId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        a.vx += dx * 0.00035;
        a.vy += dy * 0.00035;
        a.vz += dz * 0.00035;
        b.vx -= dx * 0.00035;
        b.vy -= dy * 0.00035;
        b.vz -= dz * 0.00035;
      }

      for (const n of nodes) {
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.vz *= 0.92;
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        // soft bounds
        n.x *= 0.998;
        n.y *= 0.998;
        n.z *= 0.998;
      }

      // draw
      ctx.clearRect(0, 0, width, height);
      const g = ctx.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
      g.addColorStop(0, 'hsla(220, 40%, 12%, 0.9)');
      g.addColorStop(0.45, 'hsla(240, 30%, 7%, 0.95)');
      g.addColorStop(1, 'hsla(240, 20%, 4%, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // faint star dust
      ctx.fillStyle = 'hsla(210, 40%, 80%, 0.08)';
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97) % width);
        const sy = ((i * 53) % height);
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }

      const projected = nodes.map(n => ({ n, p: project(n, width, height) }));
      projected.sort((a, b) => a.p.depth - b.p.depth);

      // links
      for (const e of edgeList) {
        const a = projected.find(x => x.n.id === e.fromId);
        const b = projected.find(x => x.n.id === e.toId);
        if (!a || !b) continue;
        const alpha = 0.25 + 0.35 * ((a.p.scale + b.p.scale) / 2);
        ctx.beginPath();
        ctx.moveTo(a.p.sx, a.p.sy);
        const mx = (a.p.sx + b.p.sx) / 2 + (a.p.sy - b.p.sy) * 0.08;
        const my = (a.p.sy + b.p.sy) / 2 + (b.p.sx - a.p.sx) * 0.08;
        ctx.quadraticCurveTo(mx, my, b.p.sx, b.p.sy);
        ctx.strokeStyle = `hsla(200, 80%, 70%, ${alpha})`;
        ctx.lineWidth = 1.2 * ((a.p.scale + b.p.scale) / 2);
        ctx.stroke();
      }

      for (const { n, p } of projected) {
        const r = n.radius * p.scale * (n.kind === 'chapter' ? 1.35 : 1);
        const selected = selectedId === n.id || linkFrom?.id === n.id;
        const hovered = hoverId === n.id;
        const glow = selected || hovered ? 18 : 10;
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r + glow);
        grd.addColorStop(0, `hsla(${n.hue}, 85%, 70%, ${selected ? 0.95 : 0.75})`);
        grd.addColorStop(0.45, `hsla(${n.hue}, 70%, 55%, 0.35)`);
        grd.addColorStop(1, `hsla(${n.hue}, 60%, 40%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r + glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(2, r), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue}, 90%, ${n.kind === 'chapter' ? 72 : 65}%, 0.95)`;
        ctx.fill();

        if (hovered || selected || n.kind === 'chapter') {
          ctx.font = `${Math.max(10, 11 * p.scale)}px ui-sans-serif, system-ui`;
          ctx.fillStyle = 'hsla(0, 0%, 96%, 0.85)';
          ctx.textAlign = 'center';
          const label = n.title.length > 14 ? n.title.slice(0, 13) + '…' : n.title;
          ctx.fillText(label, p.sx, p.sy - r - 6);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [selectedId, hoverId, linkFrom]);

  const pickNode = (clientX: number, clientY: number): SimNode | null => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { width, height } = rect;
    const { yaw, pitch } = rotRef.current;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    let best: SimNode | null = null;
    let bestD = 28;
    for (const n of nodesRef.current) {
      const x1 = n.x * cosYaw + n.z * sinYaw;
      const z1 = -n.x * sinYaw + n.z * cosYaw;
      const y2 = n.y * cosPitch - z1 * sinPitch;
      const z2 = n.y * sinPitch + z1 * cosPitch;
      const dist = 520 / zoomRef.current;
      const f = dist / (dist + z2 + 280);
      const screenX = width / 2 + x1 * f;
      const screenY = height / 2 + y2 * f;
      const d = Math.hypot(screenX - x, screenY - y);
      const hit = n.radius * f * 2.8 + 8;
      if (d < hit && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  };

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const c = chapters.find(x => x.id === selectedId);
    if (c) {
      return {
        id: c.id,
        kind: 'chapter' as const,
        title: c.title,
        subtitle: c.brakeMode ? `刹车 ${c.brakeMode} · ${brakeLabels[c.brakeMode]}` : '章节 · 未判定刹车',
      };
    }
    const t = threads.find(x => x.id === selectedId);
    if (t) {
      return {
        id: t.id,
        kind: 'thread' as const,
        title: t.title,
        subtitle: t.tags.slice(0, 2).join(' · ') || '灵感粒子',
      };
    }
    return null;
  }, [selectedId, chapters, threads]);

  const relatedLinks = links.filter(l => l.fromId === selectedId || l.toId === selectedId);

  const tryLink = (target: SimNode) => {
    if (!linkFrom) {
      setLinkFrom({ id: target.id, kind: target.kind });
      setSelectedId(target.id);
      return;
    }
    if (linkFrom.id === target.id) {
      setLinkFrom(null);
      return;
    }
    const id = onAddLink({
      fromId: linkFrom.id,
      toId: target.id,
      fromKind: linkFrom.kind,
      toKind: target.kind,
      label: linkLabel.trim() || '草蛇灰线',
    });
    if (id) {
      setLinkLabel('');
      setLinkFrom(null);
      setSelectedId(target.id);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-[min(72dvh,640px)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">粒子海 · 灵感嫁接</div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            拖拽旋转视角，滚轮缩放。点「连线」再依次点两个粒子，把章节与线索用草蛇灰线接上。
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 shrink-0"
          onClick={() => {
            rotRef.current = { yaw: 0.35, pitch: 0.25 };
            zoomRef.current = 1;
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          复位
        </Button>
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 min-h-[280px] rounded-xl overflow-hidden border border-border/70 touch-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={e => {
            const hit = pickNode(e.clientX, e.clientY);
            if (hit && linkFrom) {
              tryLink(hit);
              return;
            }
            if (hit) {
              setSelectedId(hit.id);
              return;
            }
            dragRef.current = { x: e.clientX, y: e.clientY, dragging: true };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={e => {
            const hit = pickNode(e.clientX, e.clientY);
            setHoverId(hit?.id ?? null);
            if (!dragRef.current?.dragging) return;
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            dragRef.current.x = e.clientX;
            dragRef.current.y = e.clientY;
            rotRef.current.yaw += dx * 0.005;
            rotRef.current.pitch = Math.max(-1.1, Math.min(1.1, rotRef.current.pitch + dy * 0.005));
          }}
          onPointerUp={() => {
            if (dragRef.current) dragRef.current.dragging = false;
          }}
          onWheel={e => {
            e.preventDefault();
            zoomRef.current = Math.max(0.55, Math.min(2.4, zoomRef.current * (e.deltaY > 0 ? 0.94 : 1.06)));
          }}
        />

        {(chapters.length + threads.length) === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
            先粘贴章节或线索，粒子会出现在这里
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={linkFrom ? 'default' : 'secondary'}
          className="h-9 gap-1.5"
          onClick={() => {
            if (linkFrom) setLinkFrom(null);
            else if (selected) setLinkFrom({ id: selected.id, kind: selected.kind });
          }}
          disabled={!selected && !linkFrom}
        >
          <Link2 className="w-3.5 h-3.5" />
          {linkFrom ? '点第二个粒子完成连线' : '开始连线'}
        </Button>
        <Input
          value={linkLabel}
          onChange={e => setLinkLabel(e.target.value)}
          placeholder="嫁接说明（可选）"
          className="h-9 flex-1 min-w-[140px] text-xs"
        />
      </div>

      {selected && (
        <div className="rounded-lg border bg-card/80 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{selected.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {selected.kind === 'chapter' ? '章节粒子' : '线索粒子'} · {selected.subtitle}
              </div>
            </div>
            <Badgeish kind={selected.kind} />
          </div>
          {relatedLinks.length > 0 ? (
            <ul className="space-y-1.5">
              {relatedLinks.map(l => {
                const otherId = l.fromId === selected.id ? l.toId : l.fromId;
                const other =
                  chapters.find(c => c.id === otherId)?.title ||
                  threads.find(t => t.id === otherId)?.title ||
                  otherId;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">
                      ↔ {other}
                      {l.label ? ` · ${l.label}` : ''}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/20 text-destructive"
                      onClick={() => onDeleteLink(l.id)}
                      title="断开"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">尚无嫁接。用「开始连线」把它接到别的粒子上。</p>
          )}
        </div>
      )}
    </div>
  );
}

function Badgeish({ kind }: { kind: NodeKind }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
      kind === 'chapter'
        ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
        : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
    }`}>
      {kind === 'chapter' ? '章节' : '线索'}
    </span>
  );
}
