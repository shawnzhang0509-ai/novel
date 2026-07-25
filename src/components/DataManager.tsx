import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
      <SheetContent side="bottom" className="h-auto sm:max-h-[60dvh] flex flex-col px-4 py-0">
        <SheetHeader className="pt-4 pb-2">
          <SheetTitle>数据管理</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">导出备份</div>
            <p className="text-xs text-muted-foreground">
              导出 A 线索、B 价值观、连线和 Sheet 链接为 JSON。
            </p>
            <Button variant="outline" className="w-full h-11 gap-2" onClick={onExport}>
              <Download className="w-4 h-4" />
              导出 JSON
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">导入恢复</div>
            <p className="text-xs text-muted-foreground">
              选择本工具导出的 JSON，会覆盖当前数据。
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
                  ? `导入成功，共 ${importResult.count} 条线索`
                  : `导入失败：${importResult.error}`}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
