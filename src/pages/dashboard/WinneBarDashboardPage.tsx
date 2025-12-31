import { AreaDashboard } from '@/components/consumos/AreaDashboard';
import { useProductosPorArea } from '@/hooks/useProductosPorArea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WinneBarDashboardPage() {
  const { productosPorCategoria, loading, error } = useProductosPorArea('WINNE_BAR');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-hotel-wine-600" />
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AreaDashboard area="WINNE_BAR" titulo="Winne Bar" productosPorCategoria={productosPorCategoria} />;
}
