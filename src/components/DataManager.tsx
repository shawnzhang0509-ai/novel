import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';

interface DataManagerProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<{ success: boolean; count: number; error?: string }>;
}

export default function DataManager({ open, onClose, onExport, onImport }: DataManagerProps) {
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await onImport(file);
    setImportResult(result);
    e.target.value = '';
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto sm:max-h-[70dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2">
          <SheetTitle>数据管理</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/25 p-3 space-y-1.5">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              数据存在哪
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              线索 / 价值观 / 连线 / 正文链接存在<strong className="text-foreground/90 font-medium">本机浏览器</strong>里，不是云端。
              换手机、清缓存、无痕模式关掉，都可能丢。想留住：定期点下面「导出 JSON」，存到网盘。
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              小说正文若写在 Google Doc/Sheet，正文本身由 Google 账号保存；这里只存那个链接。
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">导出备份（推荐）</div>
            <p className="text-xs text-muted-foreground">
              导出 A 线索、B 价值观、连线和正文链接为 JSON，建议丢进网盘。
            </p>
            <Button variant="default" className="w-full h-11 gap-2" onClick={onExport}>
              <Download className="w-4 h-4" />
              导出 JSON 备份
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">导入恢复</div>
            <p className="text-xs text-muted-foreground">
              选择以前导出的 JSON，会覆盖当前本机数据。
            </p>
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
