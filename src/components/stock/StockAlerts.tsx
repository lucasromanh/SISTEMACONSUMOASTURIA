import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, PackageX, RefreshCw } from 'lucide-react';
import { stockService } from '@/services/stock.service';
import type { AreaConsumo } from '@/types/consumos';
import { Button } from '@/components/ui/button';

interface StockAlert {
    id: number;
    area: string;
    nombre: string;
    categoria: string;
    stock_actual: number;
    stock_minimo: number;
    unidad: string;
    nivel_alerta: 'AGOTADO' | 'BAJO' | 'OK';
}

interface StockAlertsProps {
    area?: AreaConsumo;
    showOnlyArea?: boolean;
}

const AREA_LABELS: Record<string, string> = {
    WINNE_BAR: 'Winne Bar',
    BARRA_PILETA: 'Barra Pileta',
    FINCA: 'La Finca',
    RESTAURANTE: 'Restaurante',
    GENERAL: 'General',
};

export function StockAlerts({ area, showOnlyArea = false }: StockAlertsProps) {
    const [alertas, setAlertas] = useState<StockAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        loadAlertas();
    }, [area, showOnlyArea, refreshKey]);

    const loadAlertas = async () => {
        setLoading(true);
        try {
            const response = await stockService.getStockAlerts(showOnlyArea && area ? area : undefined);
            if (response.success) {
                setAlertas(response.alertas);
            }
        } catch (error) {
            console.error('Error al cargar alertas de stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    if (loading) {
        return (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Alertas de Stock
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Cargando alertas...</p>
                </CardContent>
            </Card>
        );
    }

    if (alertas.length === 0) {
        return null; // No mostrar card si no hay alertas
    }

    const alertasAgotadas = alertas.filter(a => a.nivel_alerta === 'AGOTADO');
    const alertasBajas = alertas.filter(a => a.nivel_alerta === 'BAJO');

    return (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950 dark:border-amber-700">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Alertas de Stock
                        <Badge variant="destructive" className="ml-2">
                            {alertas.length}
                        </Badge>
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        className="h-8 w-8"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Productos agotados */}
                {alertasAgotadas.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <PackageX className="h-4 w-4 text-red-600" />
                            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                                Stock Agotado ({alertasAgotadas.length})
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {alertasAgotadas.map((alerta) => (
                                <div
                                    key={alerta.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-red-900 dark:text-red-100 truncate">
                                            {alerta.nombre}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {AREA_LABELS[alerta.area] || alerta.area}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {alerta.categoria}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className="text-lg font-bold text-red-700 dark:text-red-400">
                                            0 {alerta.unidad}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Mín: {alerta.stock_minimo}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Productos con stock bajo */}
                {alertasBajas.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Stock Bajo ({alertasBajas.length})
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {alertasBajas.map((alerta) => (
                                <div
                                    key={alerta.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-amber-900 dark:text-amber-100 truncate">
                                            {alerta.nombre}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {AREA_LABELS[alerta.area] || alerta.area}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {alerta.categoria}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                            {alerta.stock_actual} {alerta.unidad}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Mín: {alerta.stock_minimo}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
