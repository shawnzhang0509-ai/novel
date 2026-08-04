import { useEffect, useState } from 'react';
import type { SimpleStore } from '@/types/simple';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Cloud,
  CloudUpload,
  CloudDownload,
  Copy,
  RefreshCw,
} from 'lucide-react';
import {
  cloudHealth,
  cloudPull,
  cloudPush,
  generateSyncCode,
  loadSyncCode,
  saveSyncCode,
} from '@/lib/cloudSync';

interface DataManagerProps {
  open: boolean;
  onClose: () => void;
  store: SimpleStore;
  onExport: () => void;
  onImport: (file: File) => Promise<{ success: boolean; count: number; error?: string }>;
  onReplaceStore: (store: SimpleStore) => void;
}

export default function DataManager({
  open,
  onClose,
  store,
  onExport,
  onImport,
  onReplaceStore,
}: DataManagerProps) {
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);
  const [syncCode, setSyncCode] = useState('');
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [redisStatus, setRedisStatus] = useState<'checking' | 'ready' | 'missing' | 'unknown'>('checking');
  const [redisHint, setRedisHint] = useState('');

  useEffect(() => {
    if (!open) return;
    setSyncCode(loadSyncCode());
    setRedisStatus('checking');
    cloudHealth().then(h => {
      setRedisStatus(h.redis);
      setRedisHint(h.hint || '');
    });
  }, [open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await onImport(file);
    setImportResult(result);
    e.target.value = '';
  };

  const ensureCode = () => {
    const code = syncCode.trim() || generateSyncCode();
    setSyncCode(code);
    saveSyncCode(code);
    return code;
  };

  const pushCloud = async () => {
    setCloudBusy(true);
    setCloudMsg('');
    const code = ensureCode();
    const res = await cloudPush(code, store);
    setCloudBusy(false);
    if (res.ok) {
      setCloudMsg(`已保存到云端。换浏览器时输入同步码「${code}」再拉取。`);
    } else {
      setCloudMsg(`保存失败：${res.error}`);
    }
  };

  const pullCloud = async () => {
    const code = syncCode.trim();
    if (!code) {
      setCloudMsg('先填写或生成同步码');
      return;
    }
    setCloudBusy(true);
    setCloudMsg('');
    saveSyncCode(code);
    const res = await cloudPull(code);
    setCloudBusy(false);
    if (!res.ok) {
      setCloudMsg(`拉取失败：${res.error}`);
      return;
    }
    if (!res.data) {
      setCloudMsg('云端还没有数据，先在旧浏览器点「保存到云端」');
      return;
    }
    if (!confirm('用云端数据覆盖本机？（文章、线索、粒子连线都会替换）')) return;
    onReplaceStore(res.data);
    setCloudMsg('已从云端拉回：粒子海也会一起回来');
  };

  const statusLabel =
    redisStatus === 'ready' ? 'Redis 已就绪' :
    redisStatus === 'missing' ? '尚未配置 Redis' :
    redisStatus === 'checking' ? '检查中…' :
    '无法检测（需部署到 Vercel）';

  const statusClass =
    redisStatus === 'ready' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300' :
    redisStatus === 'missing' ? 'border-amber-500/35 bg-amber-500/10 text-amber-200' :
    'border-border bg-muted/30 text-muted-foreground';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2">
          <SheetTitle>数据管理</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-5 overflow-y-auto">
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/8 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-sky-400" />
                云端同步（Upstash Redis）
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusClass}`}>
                {statusLabel}
              </span>
            </div>

            {redisStatus !== 'ready' && (
              <ol className="text-xs text-muted-foreground leading-relaxed list-decimal pl-4 space-y-1.5">
                <li>打开 <span className="text-foreground/90">upstash.com</span> 免费注册 → Create Database → Redis</li>
                <li>复制 <span className="text-foreground/90">REST URL</span> 和 <span className="text-foreground/90">REST TOKEN</span></li>
                <li>Vercel 项目 → Settings → Environment Variables 添加：
                  <code className="block mt-1 text-[10px] font-mono text-foreground/85 bg-background/50 rounded px-2 py-1">
                    UPSTASH_REDIS_REST_URL
                    <br />
                    UPSTASH_REDIS_REST_TOKEN
                  </code>
                </li>
                <li>Deployments → 最新一次 → Redeploy（必须重新部署才生效）</li>
                <li>回到这里：生成同步码 → 保存到云端；换浏览器输入同一码 → 拉取</li>
              </ol>
            )}

            {redisHint && redisStatus !== 'ready' && (
              <p className="text-[11px] text-amber-200/90 leading-relaxed">{redisHint}</p>
            )}

            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">同步码（换设备 / 换浏览器填同一串）</div>
              <div className="flex gap-2">
                <Input
                  value={syncCode}
                  onChange={e => setSyncCode(e.target.value.trim())}
                  onBlur={() => saveSyncCode(syncCode)}
                  placeholder="点右侧生成"
                  className="h-10 text-sm font-mono"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 shrink-0 px-3"
                  onClick={() => {
                    const code = generateSyncCode();
                    setSyncCode(code);
                    saveSyncCode(code);
                    setCloudMsg('已生成新同步码，记得点「保存到云端」');
                  }}
                  title="生成"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 px-3"
                  disabled={!syncCode}
                  onClick={async () => {
                    await navigator.clipboard.writeText(syncCode);
                    setCloudMsg('同步码已复制');
                  }}
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 h-11 gap-1.5" disabled={cloudBusy} onClick={pushCloud}>
                <CloudUpload className="w-4 h-4" />
                保存到云端
              </Button>
              <Button variant="outline" className="flex-1 h-11 gap-1.5" disabled={cloudBusy} onClick={pullCloud}>
                <CloudDownload className="w-4 h-4" />
                从云端拉取
              </Button>
            </div>
            {cloudMsg && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{cloudMsg}</p>
            )}
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/25 p-3 space-y-1.5">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              本机缓存
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              平时写在本机浏览器。换浏览器不会自动带上，要用上面的云端同步或 JSON 文件。
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">导出 JSON 文件</div>
            <Button variant="outline" className="w-full h-11 gap-2" onClick={onExport}>
              <Download className="w-4 h-4" />
              导出 JSON 备份
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">导入 JSON 文件</div>
            <label className="flex items-center justify-center w-full h-11 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              <span className="text-sm">选择备份文件</span>
              <input type="file" accept=".json" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {importResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              importResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'
            }`}>
              {importResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                {importResult.success
                  ? `导入成功，共 ${importResult.count} 条`
                  : `导入失败：${importResult.error}`}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
