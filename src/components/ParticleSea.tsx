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
  radius: number;
}

interface DustStar {
  x: number;
  y: number;
  z: number;
  size: number;
  hue: number;
  twinkle: number;
}

interface Burst {
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  hue: number;
  sparks: { ox: number; oy: number; oz: number; vx: number; vy: number; vz: number }[];
}

const ZOOM_MIN = 0.04;
const ZOOM_MAX = 48;
const ZOOM_HOME = 1;
const COLLIDE_R = 28;

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
  const dustRef = useRef<DustStar[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const linksRef = useRef(links);
  const linkLabelRef = useRef('');
  const onAddLinkRef = useRef(onAddLink);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<{ id: string; kind: ParticleKind } | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [zoomLabel, setZoomLabel] = useState(formatZoom(ZOOM_HOME));
  const [shiftHeld, setShiftHeld] = useState(false);
  const [dragLine, setDragLine] = useState<{
    fromId: string;
    fromKind: ParticleKind;
    x: number;
    y: number;
  } | null>(null);

  const camRef = useRef({
    yaw: 0.4,
    pitch: 0.22,
    zoom: ZOOM_HOME,
    panX: 0,
    panY: 0,
  });

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'none' | 'orbit' | 'pinch' | 'pan' | 'linkdrag';
    lastX: number;
    lastY: number;
    pinchDist: number;
    pinchZoom: number;
    linkFromId: string | null;
    linkFromKind: ParticleKind | null;
    moved: boolean;
  }>({
    mode: 'none',
    lastX: 0,
    lastY: 0,
    pinchDist: 0,
    pinchZoom: 1,
    linkFromId: null,
    linkFromKind: null,
    moved: false,
  });

  const key = useMemo(
    () => clues.map(c => c.id).join(',') + '|' + values.map(v => v.id).join(','),
    [clues, values]
  );
  linksRef.current = links;
  linkLabelRef.current = linkLabel;
  onAddLinkRef.current = onAddLink;

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
    const beforeX = (sx - cx - cam.panX) / cam.zoom;
    const beforeY = (sy - cy - cam.panY) / cam.zoom;
    cam.zoom = clampZoom(cam.zoom * factor);
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

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1600);
  };

  const spawnBurst = (x: number, y: number, z: number, hue: number, strong = false) => {
    const n = strong ? 18 : 10;
    const sparks = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (strong ? 2.8 : 1.6) + Math.random() * 2.2;
      return {
        ox: 0,
        oy: 0,
        oz: 0,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.85,
        vz: (Math.random() - 0.5) * sp,
      };
    });
    burstsRef.current.push({
      x,
      y,
      z,
      life: strong ? 28 : 18,
      maxLife: strong ? 28 : 18,
      hue,
      sparks,
    });
  };

  const tryConnect = (aId: string, aKind: ParticleKind, bId: string, bKind: ParticleKind) => {
    if (aId === bId) return;
    if (aKind !== bKind) {
      flash('只能 A连A，或 B连B');
      const a = nodesRef.current.find(n => n.id === aId);
      const b = nodesRef.current.find(n => n.id === bId);
      if (a && b) spawnBurst((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 0, true);
      return;
    }
    const ok = onAddLinkRef.current(aKind, aId, bId, linkLabelRef.current.trim());
    if (ok) {
      flash('已连上');
      setLinkLabel('');
      const a = nodesRef.current.find(n => n.id === aId);
      const b = nodesRef.current.find(n => n.id === bId);
      if (a && b) {
        const hue = aKind === 'clue' ? 38 : 265;
        spawnBurst((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, hue, true);
      }
    } else {
      flash('已存在这条线');
    }
  };

  // keyboard: Shift / L held = click-two-to-link
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'l' || e.key === 'L') setShiftHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'l' || e.key === 'L') {
        setShiftHeld(false);
        setLinkFrom(null);
      }
      if (e.key === 'Escape') {
        setLinkFrom(null);
        setDragLine(null);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const nodes: SimNode[] = [];
    const spread = 560;
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
        radius: COLLIDE_R,
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
        radius: COLLIDE_R,
      });
    }
    nodesRef.current = nodes;

    // 虚空尘埃：真正 3D 世界坐标，跟镜头一起缩放/旋转
    const dust: DustStar[] = [];
    for (let i = 0; i < 220; i++) {
      const r = 180 + seed(`d-r-${i}`) * 900;
      const theta = seed(`d-t-${i}`) * Math.PI * 2;
      const phi = (seed(`d-p-${i}`) - 0.5) * Math.PI;
      dust.push({
        x: r * Math.cos(theta) * Math.cos(phi),
        y: r * Math.sin(phi) * 0.85,
        z: r * Math.sin(theta) * Math.cos(phi),
        size: 0.6 + seed(`d-s-${i}`) * 2.2,
        hue: 200 + seed(`d-h-${i}`) * 40,
        twinkle: seed(`d-w-${i}`) * Math.PI * 2,
      });
    }
    dustRef.current = dust;
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

    const projectXYZ = (x: number, y: number, z: number, w: number, h: number) => {
      const cam = camRef.current;
      const cosYaw = Math.cos(cam.yaw);
      const sinYaw = Math.sin(cam.yaw);
      const cosPitch = Math.cos(cam.pitch);
      const sinPitch = Math.sin(cam.pitch);
      const x1 = x * cosYaw + z * sinYaw;
      const z1 = -x * sinYaw + z * cosYaw;
      const y2 = y * cosPitch - z1 * sinPitch;
      const z2 = y * sinPitch + z1 * cosPitch;
      const dist = 620 / Math.sqrt(cam.zoom);
      const f = dist / (dist + z2 + 300);
      const screenScale = f * cam.zoom;
      return {
        sx: w / 2 + cam.panX + x1 * screenScale,
        sy: h / 2 + cam.panY + y2 * screenScale,
        scale: screenScale,
        depth: z2,
      };
    };

    const tick = () => {
      if (!running) return;
      const { width, height } = wrap.getBoundingClientRect();
      const nodes = nodesRef.current;
      const edgeList = linksRef.current;
      const cam = camRef.current;
      const z = cam.zoom;

      // soft drift
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.vx += Math.sin(performance.now() * 0.00022 + i) * 0.01;
        a.vy += Math.cos(performance.now() * 0.00018 + i) * 0.009;
        a.vz += Math.sin(performance.now() * 0.00015 + i * 0.7) * 0.01;
      }

      // repulsion + hard collision with burst
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
          const minD = a.radius + b.radius;

          // soft field
          const soft = 700 / (dist * dist + 80);
          a.vx += (dx / dist) * soft * 0.02;
          a.vy += (dy / dist) * soft * 0.02;
          a.vz += (dz / dist) * soft * 0.02;
          b.vx -= (dx / dist) * soft * 0.02;
          b.vy -= (dy / dist) * soft * 0.02;
          b.vz -= (dz / dist) * soft * 0.02;

          if (dist < minD) {
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;
            const overlap = minD - dist;
            a.x += nx * overlap * 0.52;
            a.y += ny * overlap * 0.52;
            a.z += nz * overlap * 0.52;
            b.x -= nx * overlap * 0.52;
            b.y -= ny * overlap * 0.52;
            b.z -= nz * overlap * 0.52;

            const rvx = a.vx - b.vx;
            const rvy = a.vy - b.vy;
            const rvz = a.vz - b.vz;
            const vn = rvx * nx + rvy * ny + rvz * nz;
            if (vn < 0) {
              const bounce = 1.35;
              a.vx -= vn * nx * bounce;
              a.vy -= vn * ny * bounce;
              a.vz -= vn * nz * bounce;
              b.vx += vn * nx * bounce;
              b.vy += vn * ny * bounce;
              b.vz += vn * nz * bounce;

              const impact = Math.min(1, Math.abs(vn) / 3);
              if (impact > 0.12) {
                const hue = a.kind === b.kind ? (a.kind === 'clue' ? 38 : 265) : 15;
                spawnBurst(
                  (a.x + b.x) / 2,
                  (a.y + b.y) / 2,
                  (a.z + b.z) / 2,
                  hue,
                  impact > 0.45
                );
              }
            }
          }
        }
      }

      // spring along links
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
        n.vx *= 0.94;
        n.vy *= 0.94;
        n.vz *= 0.94;
        n.x = (n.x + n.vx) * 0.9992;
        n.y = (n.y + n.vy) * 0.9992;
        n.z = (n.z + n.vz) * 0.9992;
      }

      // bursts evolve
      burstsRef.current = burstsRef.current.filter(b => {
        b.life -= 1;
        for (const s of b.sparks) {
          s.ox += s.vx;
          s.oy += s.vy;
          s.oz += s.vz;
          s.vx *= 0.92;
          s.vy *= 0.92;
          s.vz *= 0.92;
        }
        return b.life > 0;
      });

      // void wash
      const g = ctx.createRadialGradient(width * 0.5, height * 0.42, 6, width * 0.5, height * 0.5, Math.max(width, height));
      g.addColorStop(0, 'hsla(215, 30%, 11%, 1)');
      g.addColorStop(1, 'hsla(240, 22%, 3%, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // 3D dust — same camera as particles
      const t = performance.now() * 0.001;
      for (const d of dustRef.current) {
        const p = projectXYZ(d.x, d.y, d.z, width, height);
        if (p.depth < -500) continue;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.4 + d.twinkle));
        const r = Math.max(0.35, d.size * p.scale * 0.55);
        if (r < 0.25 && z < 0.2) continue;
        ctx.fillStyle = `hsla(${d.hue}, 55%, 85%, ${0.18 * tw * Math.min(1.4, 0.5 + z * 0.4)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const projected = nodes.map(n => ({ n, p: projectXYZ(n.x, n.y, n.z, width, height) }));
      projected.sort((a, b) => a.p.depth - b.p.depth);

      const linkAlpha = Math.min(0.6, 0.18 + z * 0.28);
      for (const e of edgeList) {
        const a = projected.find(x => x.n.id === e.fromId);
        const b = projected.find(x => x.n.id === e.toId);
        if (!a || !b) continue;
        const hue = e.kind === 'clue' ? 38 : 265;
        ctx.beginPath();
        ctx.moveTo(a.p.sx, a.p.sy);
        ctx.lineTo(b.p.sx, b.p.sy);
        ctx.strokeStyle = `hsla(${hue}, 85%, 70%, ${linkAlpha})`;
        ctx.lineWidth = Math.max(0.5, Math.min(2.4, 1.2 * Math.sqrt(z)));
        ctx.stroke();
      }

      // rubber-band while dragging to link
      const gState = gestureRef.current;
      if (gState.mode === 'linkdrag' && gState.linkFromId) {
        const from = projected.find(x => x.n.id === gState.linkFromId);
        if (from) {
          const hue = gState.linkFromKind === 'clue' ? 38 : 265;
          ctx.beginPath();
          ctx.moveTo(from.p.sx, from.p.sy);
          ctx.lineTo(gState.lastX, gState.lastY);
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = `hsla(${hue}, 90%, 75%, 0.85)`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const showLabels = z >= 0.35;
      const showAllLabels = z >= 0.85;

      for (const { n, p } of projected) {
        const hue = n.kind === 'clue' ? 38 : 265;
        const r = Math.max(0.7, 5.6 * p.scale);
        const hot = selectedId === n.id || linkFrom?.id === n.id || hoverId === n.id;
        const glowR = r + (hot ? 16 + Math.min(28, z * 2) : 9 + Math.min(16, z));

        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowR);
        glow.addColorStop(0, `hsla(${hue}, 90%, 72%, 0.9)`);
        glow.addColorStop(0.5, `hsla(${hue}, 75%, 55%, 0.28)`);
        glow.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 92%, 68%, 0.96)`;
        ctx.fill();

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

      // draw bursts in screen space via project
      for (const b of burstsRef.current) {
        const life = b.life / b.maxLife;
        for (const s of b.sparks) {
          const p = projectXYZ(b.x + s.ox, b.y + s.oy, b.z + s.oz, width, height);
          const rr = Math.max(0.6, 2.2 * life * Math.min(2, p.scale));
          ctx.fillStyle = `hsla(${b.hue}, 95%, 70%, ${life * 0.9})`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, rr, 0, Math.PI * 2);
          ctx.fill();
        }
        const core = projectXYZ(b.x, b.y, b.z, width, height);
        const flashR = 8 * life * Math.min(2.5, 0.8 + core.scale);
        const grd = ctx.createRadialGradient(core.sx, core.sy, 0, core.sx, core.sy, flashR * 3);
        grd.addColorStop(0, `hsla(${b.hue}, 100%, 90%, ${life * 0.7})`);
        grd.addColorStop(1, `hsla(${b.hue}, 90%, 50%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(core.sx, core.sy, flashR * 3, 0, Math.PI * 2);
        ctx.fill();
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
    let bestD = 40;
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
      const hitR = Math.max(16, 7 * screenScale + 12);
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
    if (c) return { id: c.id, kind: 'clue' as const, title: c.title, note: c.detail || c.note };
    const v = values.find(x => x.id === selectedId);
    if (v) return { id: v.id, kind: 'value' as const, title: v.title, note: v.note };
    return null;
  }, [selectedId, clues, values]);

  const related = links.filter(l => l.fromId === selectedId || l.toId === selectedId);

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleParticleClickLink = (hit: SimNode) => {
    if (linkFrom) {
      if (linkFrom.id === hit.id) {
        setLinkFrom(null);
        return;
      }
      tryConnect(linkFrom.id, linkFrom.kind, hit.id, hit.kind);
      setLinkFrom(null);
      setSelectedId(hit.id);
      return;
    }
    setLinkFrom({ id: hit.id, kind: hit.kind });
    setSelectedId(hit.id);
    flash('再点一个同类完成连线');
  };

  return (
    <div className="flex flex-col gap-3 h-[min(72dvh,660px)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">粒子海</div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            背景尘埃是虚空星点（跟镜头一起缩放）。琥珀 A · 紫 B。
            <span className="text-foreground/80"> 从粒子拖到另一个可连线</span>
            ；或按住 <kbd className="px-1 rounded border border-border/80 bg-muted/50">Shift</kbd>/
            <kbd className="px-1 rounded border border-border/80 bg-muted/50">L</kbd> 点两下。
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
            const p = localPoint(e);
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
                linkFromId: null,
                linkFromKind: null,
                moved: false,
              };
              return;
            }

            // Shift/L click-to-link mode
            if (hit && (shiftHeld || linkFrom)) {
              handleParticleClickLink(hit);
              gestureRef.current.mode = 'none';
              return;
            }

            // start drag-to-link from a particle
            if (hit) {
              setSelectedId(hit.id);
              gestureRef.current = {
                mode: 'linkdrag',
                lastX: p.x,
                lastY: p.y,
                pinchDist: 0,
                pinchZoom: camRef.current.zoom,
                linkFromId: hit.id,
                linkFromKind: hit.kind,
                moved: false,
              };
              setDragLine({ fromId: hit.id, fromKind: hit.kind, x: p.x, y: p.y });
              return;
            }

            gestureRef.current = {
              mode: camRef.current.zoom >= 2 ? 'pan' : 'orbit',
              lastX: p.x,
              lastY: p.y,
              pinchDist: 0,
              pinchZoom: camRef.current.zoom,
              linkFromId: null,
              linkFromKind: null,
              moved: false,
            };
            setDragLine(null);
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

            const p = localPoint(e);
            const g = gestureRef.current;
            setHoverId(pick(e.clientX, e.clientY)?.id ?? null);

            if (g.mode === 'linkdrag') {
              const dx = p.x - g.lastX;
              const dy = p.y - g.lastY;
              if (Math.hypot(dx, dy) > 4) g.moved = true;
              g.lastX = p.x;
              g.lastY = p.y;
              setDragLine(prev =>
                prev ? { ...prev, x: p.x, y: p.y } : prev
              );
              return;
            }

            if (g.mode === 'none') return;
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
            const g = gestureRef.current;
            if (g.mode === 'linkdrag' && g.linkFromId && g.linkFromKind) {
              if (g.moved) {
                const hit = pick(e.clientX, e.clientY);
                if (hit && hit.id !== g.linkFromId) {
                  tryConnect(g.linkFromId, g.linkFromKind, hit.id, hit.kind);
                }
              }
              // short click without move = just select (already set)
            }
            setDragLine(null);
            pointersRef.current.delete(e.pointerId);
            if (pointersRef.current.size < 2) {
              gestureRef.current.mode = 'none';
              gestureRef.current.linkFromId = null;
              gestureRef.current.linkFromKind = null;
              gestureRef.current.moved = false;
            }
          }}
          onPointerCancel={e => {
            pointersRef.current.delete(e.pointerId);
            gestureRef.current.mode = 'none';
            setDragLine(null);
          }}
          onDoubleClick={e => {
            e.preventDefault();
            const hit = pick(e.clientX, e.clientY);
            const p = localPoint(e);
            if (hit) {
              applyZoomAt(Math.min(ZOOM_MAX / camRef.current.zoom, 3.2), p.x, p.y);
              setSelectedId(hit.id);
              spawnBurst(hit.x, hit.y, hit.z, hit.kind === 'clue' ? 38 : 265, false);
            } else {
              applyZoomAt(1.8, p.x, p.y);
            }
          }}
          onWheel={e => {
            e.preventDefault();
            const p = localPoint(e);
            const intensity = Math.min(0.25, Math.abs(e.deltaY) / 400);
            const factor = e.deltaY > 0 ? 1 - intensity : 1 + intensity;
            applyZoomAt(factor, p.x, p.y);
          }}
        />

        <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-background/70 border border-border/60 text-muted-foreground pointer-events-none">
          {zoomLabel}
          {shiftHeld || linkFrom ? ' · 连线中' : ''}
          {dragLine ? ' · 拖到目标' : ''}
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
          variant={linkFrom || shiftHeld ? 'default' : 'secondary'}
          className="h-9 gap-1.5"
          onClick={() => {
            if (linkFrom) {
              setLinkFrom(null);
              return;
            }
            if (selected) {
              setLinkFrom({ id: selected.id, kind: selected.kind });
              flash('再点一个同类');
            } else {
              flash('先点一个粒子，或按住 Shift 点两下');
            }
          }}
        >
          <Link2 className="w-3.5 h-3.5" />
          {linkFrom ? '再点同类' : '连线模式'}
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
            <p className="text-[11px] text-muted-foreground">
              还没连线：从它拖到另一个同类，或按住 Shift 点两下。
            </p>
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
