import type { EstadoConsumo } from '@/types/consumos';
import { Badge } from '@/components/ui/badge';

const estadoConfig: Record<EstadoConsumo, { label: string; className: string }> = {
  PAGADO: { label: 'Pagado', className: 'bg-green-600 hover:bg-green-700 text-white' },
  CARGAR_HABITACION: { label: 'Habitación', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
};

interface StatusBadgeProps {
  estado: EstadoConsumo;
  className?: string;
}

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const config = estadoConfig[estado];
  return <Badge className={`${config.className} ${className || ''}`}>{config.label}</Badge>;
}
