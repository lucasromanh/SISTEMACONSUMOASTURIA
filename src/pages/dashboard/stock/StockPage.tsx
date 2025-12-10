import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockTable } from '@/components/stock/StockTable';
import { StockForm } from '@/components/stock/StockForm';
import { useStockStore } from '@/store/stockStore';
import { useAuthStore } from '@/store/authStore';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import type { AreaConsumo } from '@/types/consumos';

export function StockPage() {
  const { items, getLowStockItems, loadStockItems } = useStockStore();
  const { user } = useAuthStore();

  // ✅ Cargar items de stock automáticamente al montar el componente
  useEffect(() => {
    loadStockItems();
  }, [loadStockItems]);

  const area: AreaConsumo | 'GENERAL' | undefined = useMemo(() => {
    if (!user || user.role === 'ADMIN') return undefined;
    if (user.role === 'WINNE_BAR') return 'WINNE_BAR';
    if (user.role === 'BARRA_PILETA') return 'BARRA_PILETA';
    if (user.role === 'FINCA') return 'FINCA';
    if (user.role === 'RESTAURANTE') return 'RESTAURANTE';
    return undefined;
  }, [user]);

  const filteredItems = useMemo(() => {
    if (!area) return items;
    return items.filter((item) => item.area === area || item.area === 'GENERAL');
  }, [items, area]);

  const lowStockItems = useMemo(() => {
    return getLowStockItems().filter((item) => {
      if (!area) return true;
      return item.area === area || item.area === 'GENERAL';
    });
  }, [getLowStockItems, area, items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">Control de Stock</h1>
          <p className="text-muted-foreground">
            {area ? `Área: ${area.replace('_', ' ')}` : 'Todas las áreas'}
          </p>
        </div>
        {user?.role === 'ADMIN' && <StockForm />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Productos en inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren reposición</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock OK</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {filteredItems.length - lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Niveles normales</p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => {
                const getAreaColor = (area: string) => {
                  switch (area) {
                    case 'WINNE_BAR': return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
                    case 'BARRA_PILETA': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
                    case 'FINCA': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
                    case 'RESTAURANTE': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
                    default: return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
                  }
                };
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getAreaColor(item.area)}>
                          {item.area.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">• {item.categoria}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-700 dark:text-red-400">
                        {item.stockActual} {item.unidad}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {item.stockMinimo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventario Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <StockTable items={filteredItems} />
        </CardContent>
      </Card>
    </div>
  );
}
