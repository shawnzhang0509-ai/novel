import { useEffect, useMemo, useRef, useState } from 'react';
import type { Clue, GraftLink, ParticleKind, ValueItem } from '@/types/simple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Unlink, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

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

/** 其大无外 → 其小无内：对数缩放跨度 */
const ZOOM_MIN = 0.04;
const ZOOM_MAX = 48;
const ZOOM_HOME = 1;

function seed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

function formatZoom(z: number) {
  if (z < 0.1) return `${(z * 100).toFixed(0)}% · 远`;
  if (z < 1) return `${(z * 100).toFixed(0)}%`;
  if (z < 10) return `${z.toFixed(1)}×`;
  return `${z.toFixed(0)}× · 近`;
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
  const [zoomLabel, setZoomLabel] = useState(formatZoom(ZOOM_HOME));

  const camRef = useRef({
    yaw: 0.4,
    pitch: 0.22,
    zoom: ZOOM_HOME,
    panX: 0,
    panY: 0,
  });

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'none' | 'orbit' | 'pinch' | 'pan';
    lastX: number;
    lastY: number;
    pinchDist: number;
    pinchZoom: number;
  }>({ mode: 'none', lastX: 0, lastY: 0, pinchDist: 0, pinchZoom: 1 });

  const key = useMemo(
    () => clues.map(c => c.id).join(',') + '|' + values.map(v => v.id).join(','),
    [clues, values]
  );
  linksRef.current = links;

  const bumpZoomUi = () => setZoomLabel(formatZoom(camRef.current.zoom));

  const applyZoomAt = (factor: number, sx: number, sy: number) => {
    const cam = camRef.current;
    const wrap = wrapRef.current;
    if (!wrap) {
      cam.zoom = clampZoom(cam.zoom * factor);
      bumpZoomUi();
      return;
    }
    const { width, height } = wrap.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    // world offset under cursor before zoom
    const beforeX = (sx - cx - cam.panX) / cam.zoom;
    const beforeY = (sy - cy - cam.panY) / cam.zoom;
    cam.zoom = clampZoom(cam.zoom * factor);
    // keep point under cursor stable
    cam.panX = sx - cx - beforeX * cam.zoom;
    cam.panY = sy - cy - beforeY * cam.zoom;
    bumpZoomUi();
  };

  const zoomByButton = (dir: 1 | -1) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { width, height } = wrap.getBoundingClientRect();
    applyZoomAt(dir > 0 ? 1.35 : 1 / 1.35, width / 2, height / 2);
  };

  const resetCam = () => {
    camRef.current = { yaw: 0.4, pitch: 0.22, zoom: ZOOM_HOME, panX: 0, panY: 0 };
    bumpZoomUi();
  };

  useEffect(() => {
    const nodes: SimNode[] = [];
    const spread = 520;
    for (const c of clues) {
      nodes.push({
        id: c.id,
        kind: 'clue',
        title: c.title,
        x: (seed(c.id) - 0.5) * spread,
        y: (seed(c.id + 'y') - 0.5) * spread * 0.75,
        z: (seed(c.id + 'z') - 0.5) * spread * 0.85,
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
        x: (seed(v.id) - 0.5) * spread,
        y: (seed(v.id + 'y') - 0.5) * spread * 0.75,
        z: (seed(v.id + 'z') - 0.5) * spread * 0.85,
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

    // fixed distant star layers (宇宙背景)
    const farStars = Array.from({ length: 120 }, (_, i) => ({
      x: seed(`far-${i}`) * 2000 - 1000,
      y: seed(`far-y-${i}`) * 2000 - 1000,
      s: 0.4 + seed(`far-s-${i}`) * 1.2,
      a: 0.15 + seed(`far-a-${i}`) * 0.35,
    }));
    const midStars = Array.from({ length: 80 }, (_, i) => ({
      x: seed(`mid-${i}`) * 1400 - 700,
      y: seed(`mid-y-${i}`) * 1400 - 700,
      s: 0.6 + seed(`mid-s-${i}`) * 1.6,
      a: 0.2 + seed(`mid-a-${i}`) * 0.4,
    }));

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
      const cam = camRef.current;
      const cosYaw = Math.cos(cam.yaw);
      const sinYaw = Math.sin(cam.yaw);
      const cosPitch = Math.cos(cam.pitch);
      const sinPitch = Math.sin(cam.pitch);
      const x1 = n.x * cosYaw + n.z * sinYaw;
      const z1 = -n.x * sinYaw + n.z * cosYaw;
      const y2 = n.y * cosPitch - z1 * sinPitch;
      const z2 = n.y * sinPitch + z1 * cosPitch;
      // camera distance shrinks as zoom grows → dive inward
      const dist = 620 / Math.sqrt(cam.zoom);
      const f = dist / (dist + z2 + 300);
      const screenScale = f * cam.zoom;
      return {
        sx: w / 2 + cam.panX + x1 * screenScale,
        sy: h / 2 + cam.panY + y2 * screenScale,
        scale: screenScale,
        depth: z2,
        f,
      };
    };

    const tick = () => {
      if (!running) return;
      const { width, height } = wrap.getBoundingClientRect();
      const nodes = nodesRef.current;
      const edgeList = linksRef.current;
      const cam = camRef.current;
      const z = cam.zoom;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.vx += Math.sin(performance.now() * 0.00025 + i) * 0.008;
        a.vy += Math.cos(performance.now() * 0.0002 + i) * 0.007;
        a.vz += Math.sin(performance.now() * 0.00016 + i * 0.7) * 0.008;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const d2 = dx * dx + dy * dy + dz * dz + 60;
          const d = Math.sqrt(d2);
          const rep = 900 / d2;
          a.vx += (dx / d) * rep * 0.018;
          a.vy += (dy / d) * rep * 0.018;
          a.vz += (dz / d) * rep * 0.018;
          b.vx -= (dx / d) * rep * 0.018;
          b.vy -= (dy / d) * rep * 0.018;
          b.vz -= (dz / d) * rep * 0.018;
        }
      }

      for (const e of edgeList) {
        const a = nodes.find(n => n.id === e.fromId);
        const b = nodes.find(n => n.id === e.toId);
        if (!a || !b) continue;
        a.vx += (b.x - a.x) * 0.00035;
        a.vy += (b.y - a.y) * 0.00035;
        a.vz += (b.z - a.z) * 0.00035;
        b.vx += (a.x - b.x) * 0.00035;
        b.vy += (a.y - b.y) * 0.00035;
        b.vz += (a.z - b.z) * 0.00035;
      }

      for (const n of nodes) {
        n.vx *= 0.93;
        n.vy *= 0.93;
        n.vz *= 0.93;
        n.x = (n.x + n.vx) * 0.999;
        n.y = (n.y + n.vy) * 0.999;
        n.z = (n.z + n.vz) * 0.999;
      }

      // void
      const g = ctx.createRadialGradient(
        width * 0.5 + cam.panX * 0.02,
        height * 0.42 + cam.panY * 0.02,
        8,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      g.addColorStop(0, 'hsla(215, 32%, 12%, 1)');
      g.addColorStop(0.55, 'hsla(240, 28%, 6%, 1)');
      g.addColorStop(1, 'hsla(240, 20%, 3%, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // far cosmos — almost fixed (其大无外)
      const farParallax = 0.015 * Math.min(1, 1 / Math.sqrt(z));
      for (const s of farStars) {
        const sx = ((s.x * farParallax + width * 0.5 + cam.yaw * 40) % width + width) % width;
        const sy = ((s.y * farParallax + height * 0.5 + cam.pitch * 30) % height + height) % height;
        ctx.fillStyle = `hsla(210, 40%, 90%, ${s.a * (z < 0.3 ? 1.2 : 0.7)})`;
        ctx.fillRect(sx, sy, s.s, s.s);
      }

      // mid dust — moves a bit with pan/zoom
      const midScale = 0.08 + 0.12 * Math.min(z, 2);
      for (const s of midStars) {
        const sx = width / 2 + cam.panX * 0.12 + s.x * midScale;
        const sy = height / 2 + cam.panY * 0.12 + s.y * midScale;
        if (sx < -4 || sy < -4 || sx > width + 4 || sy > height + 4) continue;
        ctx.fillStyle = `hsla(200, 50%, 85%, ${s.a * 0.55})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.s * (0.5 + midScale), 0, Math.PI * 2);
        ctx.fill();
      }

      // when very close: micro-dust inside (其小无内)
      if (z > 6) {
        const micro = Math.min(1, (z - 6) / 20);
        ctx.fillStyle = `hsla(45, 80%, 80%, ${0.08 + micro * 0.12})`;
        for (let i = 0; i < 40; i++) {
          const sx = width / 2 + cam.panX * 0.4 + Math.sin(i * 12.1 + z) * (40 + i * 9);
          const sy = height / 2 + cam.panY * 0.4 + Math.cos(i * 9.7 + z * 0.5) * (30 + i * 7);
          ctx.fillRect(sx, sy, 1 + micro, 1 + micro);
        }
      }

      const projected = nodes.map(n => ({ n, p: project(n, width, height) }));
      projected.sort((a, b) => a.p.depth - b.p.depth);

      // links fade when extremely far
      const linkAlpha = Math.min(0.55, 0.15 + z * 0.25);
      for (const e of edgeList) {
        const a = projected.find(x => x.n.id === e.fromId);
        const b = projected.find(x => x.n.id === e.toId);
        if (!a || !b) continue;
        const hue = e.kind === 'clue' ? 38 : 265;
        ctx.beginPath();
        ctx.moveTo(a.p.sx, a.p.sy);
        ctx.lineTo(b.p.sx, b.p.sy);
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${linkAlpha})`;
        ctx.lineWidth = Math.max(0.4, Math.min(2.2, 1.1 * Math.sqrt(z)));
        ctx.stroke();
      }

      const showLabels = z >= 0.35;
      const showAllLabels = z >= 0.85;

      for (const { n, p } of projected) {
        const hue = n.kind === 'clue' ? 38 : 265;
        const baseR = n.kind === 'clue' ? 5.8 : 5.4;
        const r = Math.max(0.6, baseR * p.scale);
        const hot = selectedId === n.id || linkFrom?.id === n.id || hoverId === n.id;
        const glowR = r + (hot ? 14 + Math.min(30, z * 2) : 8 + Math.min(18, z));

        // bloom
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowR);
        glow.addColorStop(0, `hsla(${hue}, 90%, 72%, ${Math.min(0.95, 0.55 + z * 0.08)})`);
        glow.addColorStop(0.45, `hsla(${hue}, 75%, 55%, 0.28)`);
        glow.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 92%, 68%, 0.96)`;
        ctx.fill();

        // deep zoom: inner ring (inside the particle)
        if (z > 8 && r > 12) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 0.35, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue}, 90%, 90%, 0.35)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        const labelOk = hot || (showAllLabels && r > 3) || (showLabels && n.kind === 'value' && r > 4);
        if (labelOk && r > 1.2) {
          const fontPx = Math.max(9, Math.min(22, 10 + z * 1.2));
          ctx.font = `${fontPx}px ui-sans-serif, system-ui`;
          ctx.fillStyle = `hsla(0,0%,96%,${Math.min(0.95, 0.55 + z * 0.15)})`;
          ctx.textAlign = 'center';
          const maxChars = z > 3 ? 28 : z > 1 ? 16 : 10;
          const label = n.title.length > maxChars ? `${n.title.slice(0, maxChars - 1)}…` : n.title;
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
    const cam = camRef.current;
    const cosYaw = Math.cos(cam.yaw);
    const sinYaw = Math.sin(cam.yaw);
    const cosPitch = Math.cos(cam.pitch);
    const sinPitch = Math.sin(cam.pitch);
    let best: SimNode | null = null;
    let bestD = 36;
    for (const n of nodesRef.current) {
      const x1 = n.x * cosYaw + n.z * sinYaw;
      const z1 = -n.x * sinYaw + n.z * cosYaw;
      const y2 = n.y * cosPitch - z1 * sinPitch;
      const z2 = n.y * sinPitch + z1 * cosPitch;
      const dist = 620 / Math.sqrt(cam.zoom);
      const f = dist / (dist + z2 + 300);
      const screenScale = f * cam.zoom;
      const sx = rect.width / 2 + cam.panX + x1 * screenScale;
      const sy = rect.height / 2 + cam.panY + y2 * screenScale;
      const hitR = Math.max(14, 6 * screenScale + 10);
      const d = Math.hypot(sx - x, sy - y);
      if (d < hitR && d < bestD) {
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

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="flex flex-col gap-3 h-[min(72dvh,660px)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">粒子海</div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            其大无外，其小无内：滚轮 / 捏合缩放，拖空白旋转，双指平移。琥珀 A · 紫 B，只连同类。
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => zoomByButton(-1)} title="缩小">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => zoomByButton(1)} title="放大">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 px-2" onClick={resetCam}>
            <RotateCcw className="w-3.5 h-3.5" />
            复位
          </Button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 min-h-[280px] rounded-xl overflow-hidden border border-border/70 touch-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={e => {
            const hit = pick(e.clientX, e.clientY);
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

            if (pointersRef.current.size === 2) {
              const pts = [...pointersRef.current.values()];
              const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              gestureRef.current = {
                mode: 'pinch',
                lastX: 0,
                lastY: 0,
                pinchDist: dist,
                pinchZoom: camRef.current.zoom,
              };
              return;
            }

            if (hit && linkFrom) {
              tryLink(hit);
              gestureRef.current.mode = 'none';
              return;
            }
            if (hit) {
              setSelectedId(hit.id);
              // drag selected = pan when zoomed in, else just select
              if (camRef.current.zoom > 1.2) {
                const p = localPoint(e);
                gestureRef.current = {
                  mode: 'pan',
                  lastX: p.x,
                  lastY: p.y,
                  pinchDist: 0,
                  pinchZoom: camRef.current.zoom,
                };
              } else {
                gestureRef.current.mode = 'none';
              }
              return;
            }

            const p = localPoint(e);
            // far out: orbit; close in: pan the cosmos
            gestureRef.current = {
              mode: camRef.current.zoom >= 2 ? 'pan' : 'orbit',
              lastX: p.x,
              lastY: p.y,
              pinchDist: 0,
              pinchZoom: camRef.current.zoom,
            };
          }}
          onPointerMove={e => {
            if (pointersRef.current.has(e.pointerId)) {
              pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }

            if (pointersRef.current.size === 2) {
              const pts = [...pointersRef.current.values()];
              const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              const g = gestureRef.current;
              if (g.mode === 'pinch' && g.pinchDist > 0) {
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;
                const rect = wrapRef.current!.getBoundingClientRect();
                const factor = dist / g.pinchDist;
                const target = clampZoom(g.pinchZoom * factor);
                const cur = camRef.current.zoom;
                applyZoomAt(target / cur, midX - rect.left, midY - rect.top);
              }
              // two-finger pan
              const cx = (pts[0].x + pts[1].x) / 2;
              const cy = (pts[0].y + pts[1].y) / 2;
              if (g.lastX || g.lastY) {
                camRef.current.panX += cx - g.lastX;
                camRef.current.panY += cy - g.lastY;
              }
              g.lastX = cx;
              g.lastY = cy;
              return;
            }

            setHoverId(pick(e.clientX, e.clientY)?.id ?? null);
            const g = gestureRef.current;
            if (g.mode === 'none') return;
            const p = localPoint(e);
            const dx = p.x - g.lastX;
            const dy = p.y - g.lastY;
            g.lastX = p.x;
            g.lastY = p.y;
            if (g.mode === 'orbit') {
              camRef.current.yaw += dx * 0.005;
              camRef.current.pitch = Math.max(-1.15, Math.min(1.15, camRef.current.pitch + dy * 0.005));
            } else if (g.mode === 'pan') {
              camRef.current.panX += dx;
              camRef.current.panY += dy;
            }
          }}
          onPointerUp={e => {
            pointersRef.current.delete(e.pointerId);
            if (pointersRef.current.size < 2) {
              gestureRef.current.mode = 'none';
              gestureRef.current.lastX = 0;
              gestureRef.current.lastY = 0;
            }
          }}
          onPointerCancel={e => {
            pointersRef.current.delete(e.pointerId);
            gestureRef.current.mode = 'none';
          }}
          onDoubleClick={e => {
            e.preventDefault();
            const hit = pick(e.clientX, e.clientY);
            const p = localPoint(e);
            if (hit) {
              // dive into particle
              applyZoomAt(Math.min(ZOOM_MAX / camRef.current.zoom, 3.2), p.x, p.y);
              setSelectedId(hit.id);
            } else {
              applyZoomAt(1.8, p.x, p.y);
            }
          }}
          onWheel={e => {
            e.preventDefault();
            const p = localPoint(e);
            // smooth log zoom; trackpads send small deltas
            const intensity = Math.min(0.25, Math.abs(e.deltaY) / 400);
            const factor = e.deltaY > 0 ? 1 - intensity : 1 + intensity;
            applyZoomAt(factor, p.x, p.y);
          }}
        />

        <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-background/70 border border-border/60 text-muted-foreground pointer-events-none">
          {zoomLabel}
        </div>

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
