import { AreaDashboard } from '@/components/consumos/AreaDashboard';
import { useProductosPorArea } from '@/hooks/useProductosPorArea';

export function BarraPiletaDashboardPage() {
  const { productosPorCategoria, loading } = useProductosPorArea('BARRA_PILETA');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return <AreaDashboard area="BARRA_PILETA" titulo="Barra Pileta" productosPorCategoria={productosPorCategoria} />;
}
