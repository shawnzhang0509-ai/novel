import { useEffect, useMemo, useRef, useState } from 'react';
import type { Clue, GraftLink, ParticleKind, ValueItem } from '@/types/simple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Unlink, RotateCcw } from 'lucide-react';

interface ParticleSeaProps {
  clues: Clue[];
  values: ValueItem[];
  links: GraftLink[];
  onAddLink: (kind: ParticleKind, fromId: string, toId: string, label?: string) => boolean | null;
  onDeleteLink: (id: string) => void;
}

interface SimNode {
  id: string;
  kind: ParticleKind;
  title: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

function seed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export default function ParticleSea({
  clues,
  values,
  links,
  onAddLink,
  onDeleteLink,
}: ParticleSeaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef(links);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<{ id: string; kind: ParticleKind } | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const rotRef = useRef({ yaw: 0.4, pitch: 0.22 });
  const dragRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const zoomRef = useRef(1);

  const key = useMemo(
    () => clues.map(c => c.id).join(',') + '|' + values.map(v => v.id).join(','),
    [clues, values]
  );
  linksRef.current = links;

  useEffect(() => {
    const nodes: SimNode[] = [];
    for (const c of clues) {
      nodes.push({
        id: c.id,
        kind: 'clue',
        title: c.title,
        x: (seed(c.id) - 0.5) * 400,
        y: (seed(c.id + 'y') - 0.5) * 300,
        z: (seed(c.id + 'z') - 0.5) * 340,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
    for (const v of values) {
      nodes.push({
        id: v.id,
        kind: 'value',
        title: v.title,
        x: (seed(v.id) - 0.5) * 400,
        y: (seed(v.id + 'y') - 0.5) * 300,
        z: (seed(v.id + 'z') - 0.5) * 340,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
    nodesRef.current = nodes;
  }, [key, clues, values]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;

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
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const x1 = n.x * cosYaw + n.z * sinYaw;
      const z1 = -n.x * sinYaw + n.z * cosYaw;
      const y2 = n.y * cosPitch - z1 * sinPitch;
      const z2 = n.y * sinPitch + z1 * cosPitch;
      const dist = 520 / zoomRef.current;
      const f = dist / (dist + z2 + 280);
      return { sx: w / 2 + x1 * f, sy: h / 2 + y2 * f, scale: f, depth: z2 };
    };

    const tick = () => {
      if (!running) return;
      const { width, height } = wrap.getBoundingClientRect();
      const nodes = nodesRef.current;
      const edgeList = linksRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.vx += Math.sin(performance.now() * 0.0003 + i) * 0.01;
        a.vy += Math.cos(performance.now() * 0.00022 + i) * 0.009;
        a.vz += Math.sin(performance.now() * 0.00018 + i * 0.7) * 0.01;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const d2 = dx * dx + dy * dy + dz * dz + 50;
          const d = Math.sqrt(d2);
          const rep = 700 / d2;
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
        a.vx += (b.x - a.x) * 0.0004;
        a.vy += (b.y - a.y) * 0.0004;
        a.vz += (b.z - a.z) * 0.0004;
        b.vx += (a.x - b.x) * 0.0004;
        b.vy += (a.y - b.y) * 0.0004;
        b.vz += (a.z - b.z) * 0.0004;
      }

      for (const n of nodes) {
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.vz *= 0.92;
        n.x = (n.x + n.vx) * 0.998;
        n.y = (n.y + n.vy) * 0.998;
        n.z = (n.z + n.vz) * 0.998;
      }

      const g = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
      g.addColorStop(0, 'hsla(215, 35%, 14%, 1)');
      g.addColorStop(1, 'hsla(240, 25%, 5%, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      const projected = nodes.map(n => ({ n, p: project(n, width, height) }));
      projected.sort((a, b) => a.p.depth - b.p.depth);

      for (const e of edgeList) {
        const a = projected.find(x => x.n.id === e.fromId);
        const b = projected.find(x => x.n.id === e.toId);
        if (!a || !b) continue;
        const hue = e.kind === 'clue' ? 38 : 265;
        ctx.beginPath();
        ctx.moveTo(a.p.sx, a.p.sy);
        ctx.lineTo(b.p.sx, b.p.sy);
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.45)`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      for (const { n, p } of projected) {
        const hue = n.kind === 'clue' ? 38 : 265;
        const r = (n.kind === 'clue' ? 5.5 : 5.2) * p.scale;
        const hot = selectedId === n.id || linkFrom?.id === n.id || hoverId === n.id;
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r + (hot ? 16 : 10));
        glow.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.9)`);
        glow.addColorStop(1, `hsla(${hue}, 70%, 40%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r + (hot ? 16 : 10), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(2.2, r), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 68%, 0.95)`;
        ctx.fill();
        if (hot || n.kind === 'value') {
          ctx.font = `${Math.max(10, 11 * p.scale)}px ui-sans-serif, system-ui`;
          ctx.fillStyle = 'hsla(0,0%,96%,0.88)';
          ctx.textAlign = 'center';
          const label = n.title.length > 12 ? `${n.title.slice(0, 11)}…` : n.title;
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

  const pick = (clientX: number, clientY: number): SimNode | null => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { yaw, pitch } = rotRef.current;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    let best: SimNode | null = null;
    let bestD = 30;
    for (const n of nodesRef.current) {
      const x1 = n.x * cosYaw + n.z * sinYaw;
      const z1 = -n.x * sinYaw + n.z * cosYaw;
      const y2 = n.y * cosPitch - z1 * sinPitch;
      const z2 = n.y * sinPitch + z1 * cosPitch;
      const dist = 520 / zoomRef.current;
      const f = dist / (dist + z2 + 280);
      const sx = rect.width / 2 + x1 * f;
      const sy = rect.height / 2 + y2 * f;
      const d = Math.hypot(sx - x, sy - y);
      if (d < 22 * f + 8 && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  };

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const c = clues.find(x => x.id === selectedId);
    if (c) return { id: c.id, kind: 'clue' as const, title: c.title, note: c.note };
    const v = values.find(x => x.id === selectedId);
    if (v) return { id: v.id, kind: 'value' as const, title: v.title, note: v.note };
    return null;
  }, [selectedId, clues, values]);

  const related = links.filter(l => l.fromId === selectedId || l.toId === selectedId);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1800);
  };

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
    if (linkFrom.kind !== target.kind) {
      flash('只能 A连A，或 B连B');
      return;
    }
    const ok = onAddLink(linkFrom.kind, linkFrom.id, target.id, linkLabel.trim());
    if (ok) {
      setLinkLabel('');
      setLinkFrom(null);
      setSelectedId(target.id);
      flash('已连上');
    } else {
      flash('已存在或无效');
    }
  };

  return (
    <div className="flex flex-col gap-3 h-[min(70dvh,620px)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">粒子海</div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            琥珀色 = A 线索，紫色 = B 价值观。只允许同类相接。拖拽旋转，滚轮缩放。
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => {
            rotRef.current = { yaw: 0.4, pitch: 0.22 };
            zoomRef.current = 1;
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          复位
        </Button>
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 min-h-[260px] rounded-xl overflow-hidden border border-border/70 touch-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={e => {
            const hit = pick(e.clientX, e.clientY);
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
            setHoverId(pick(e.clientX, e.clientY)?.id ?? null);
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
        {clues.length + values.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none px-6 text-center">
            先加几条 A 线索或 B 价值观，粒子会出现在这里
          </div>
        )}
        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full bg-background/90 border">
            {toast}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={linkFrom ? 'default' : 'secondary'}
          className="h-9 gap-1.5"
          disabled={!selected && !linkFrom}
          onClick={() => {
            if (linkFrom) setLinkFrom(null);
            else if (selected) setLinkFrom({ id: selected.id, kind: selected.kind });
          }}
        >
          <Link2 className="w-3.5 h-3.5" />
          {linkFrom ? '再点一个同类' : '连线'}
        </Button>
        <Input
          value={linkLabel}
          onChange={e => setLinkLabel(e.target.value)}
          placeholder="连线说明（可选）"
          className="h-9 flex-1 min-w-[120px] text-xs"
        />
      </div>

      {selected && (
        <div className="rounded-lg border bg-card/80 p-3 space-y-2">
          <div className="text-sm font-medium">
            <span className={selected.kind === 'clue' ? 'text-amber-400' : 'text-violet-300'}>
              {selected.kind === 'clue' ? 'A' : 'B'}
            </span>{' '}
            {selected.title}
          </div>
          {selected.note && <p className="text-xs text-muted-foreground">{selected.note}</p>}
          {related.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">还没连线。点「连线」再点另一个同类粒子。</p>
          ) : (
            <ul className="space-y-1">
              {related.map(l => {
                const otherId = l.fromId === selected.id ? l.toId : l.fromId;
                const other =
                  clues.find(c => c.id === otherId)?.title ||
                  values.find(v => v.id === otherId)?.title ||
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
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
