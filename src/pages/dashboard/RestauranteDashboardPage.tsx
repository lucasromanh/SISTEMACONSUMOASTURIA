import { AreaDashboard } from '@/components/consumos/AreaDashboard';
import { useProductosPorArea } from '@/hooks/useProductosPorArea';

export function RestauranteDashboardPage() {
  const { productosPorCategoria, loading } = useProductosPorArea('RESTAURANTE');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return <AreaDashboard area="RESTAURANTE" titulo="Restaurante" productosPorCategoria={productosPorCategoria} />;
}
