import { FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonsProps {
  onExportCSV: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onExportCSV, onExportPDF, disabled = false }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onExportCSV} disabled={disabled}>
        <FileDown className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>
      {onExportPDF && (
        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={true} title="Próximamente">
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      )}
    </div>
  );
}
