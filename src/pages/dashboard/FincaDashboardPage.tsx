import { AreaDashboard } from '@/components/consumos/AreaDashboard';
import { useProductosPorArea } from '@/hooks/useProductosPorArea';

export function FincaDashboardPage() {
  const { productosPorCategoria, loading } = useProductosPorArea('FINCA');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return <AreaDashboard area="FINCA" titulo="La Finca" productosPorCategoria={productosPorCategoria} />;
}
