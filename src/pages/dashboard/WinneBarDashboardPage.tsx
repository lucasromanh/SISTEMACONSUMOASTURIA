import { AreaDashboard } from '@/components/consumos/AreaDashboard';
import { useProductosPorArea } from '@/hooks/useProductosPorArea';

export function WinneBarDashboardPage() {
  const { productosPorCategoria, loading } = useProductosPorArea('WINNE_BAR');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return <AreaDashboard area="WINNE_BAR" titulo="Winne Bar" productosPorCategoria={productosPorCategoria} />;
}
