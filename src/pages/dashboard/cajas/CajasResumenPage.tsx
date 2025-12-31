import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { CajasResumenCards } from '@/components/cajas/CajasResumenCards';
import { CajaDetalleTabla } from '@/components/cajas/CajaDetalleTabla';
import { IngresoInicialForm } from '@/components/cajas/IngresoInicialForm';
import { ExportButtons } from '@/components/common/ExportButtons';
import { SincronizarCajaHotelButton } from '@/components/cajas/SincronizarCajaHotelButton';
import { CierreCajaButton } from '@/components/cajas/CierreCajaButton';
import { useCajasStore, useConsumosStore } from '@/store/consumosStore';
import { useAuthStore } from '@/store/authStore';
import { getDateRangeByPeriod } from '@/utils/dateHelpers';
import { exportToCsv } from '@/utils/exportToCsv';
import type { AreaConsumo } from '@/types/consumos';

export function CajasResumenPage() {
  const [periodo, setPeriodo] = useState<'day' | 'week' | 'month'>('day');
  const { getMovimientosByDateRange, movimientos: allMovimientos, loadMovimientos } = useCajasStore();
  const { getConsumosByDateRange, consumos: allConsumos, loadConsumos } = useConsumosStore();
  const { user } = useAuthStore();

  // Determinar el área según el rol del usuario
  const area: AreaConsumo | undefined = useMemo(() => {
    if (!user || user.role === 'ADMIN') return undefined;
    if (user.role === 'WINNE_BAR') return 'WINNE_BAR';
    if (user.role === 'BARRA_PILETA') return 'BARRA_PILETA';
    if (user.role === 'FINCA') return 'FINCA';
    if (user.role === 'RESTAURANTE') return 'RESTAURANTE';
    return undefined;
  }, [user]);

  // ✅ Cargar movimientos y consumos automáticamente cuando cambia el periodo o área
  useEffect(() => {
    const { start, end } = getDateRangeByPeriod(periodo);
    loadMovimientos(area, start, end);
    loadConsumos(area, start, end);
  }, [periodo, area, loadMovimientos, loadConsumos]);

  const movimientos = useMemo(() => {
    const { start, end } = getDateRangeByPeriod(periodo);
    return getMovimientosByDateRange(start, end, area);
  }, [periodo, area, getMovimientosByDateRange, allMovimientos]);

  const consumos = useMemo(() => {
    const { start, end } = getDateRangeByPeriod(periodo);
    return getConsumosByDateRange(start, end, area);
  }, [periodo, area, getConsumosByDateRange, allConsumos]);

  // Separar movimientos sincronizados y no sincronizados
  const movimientosSinSincronizar = useMemo(() =>
    movimientos.filter(m => !m.sincronizado),
    [movimientos]
  );

  const movimientosSincronizados = useMemo(() =>
    movimientos.filter(m => m.sincronizado),
    [movimientos]
  );

  const resumen = useMemo(() => {
    const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO');
    const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

    // Incluye todos los ingresos en efectivo (consumos + ingresos iniciales)
    const totalIngresosEfectivo = ingresos
      .filter((m) => m.metodoPago === 'EFECTIVO' || m.origen === 'INICIAL')
      .reduce((sum, m) => sum + m.monto, 0);

    const totalIngresosTransferencia = ingresos
      .filter((m) => m.metodoPago === 'TRANSFERENCIA')
      .reduce((sum, m) => sum + m.monto, 0);

    // ✅ CORREGIDO: Obtener ingresos de tarjeta desde CONSUMOS, no desde movimientos
    const totalIngresosTarjeta = consumos
      .filter((c) => c.estado === 'PAGADO' && c.metodoPago === 'TARJETA_CREDITO')
      .reduce((sum, c) => sum + (c.montoPagado || c.total), 0);

    const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0);

    return {
      totalIngresosEfectivo,
      totalIngresosTransferencia,
      totalIngresosTarjeta,
      totalEgresos,
      totalNeto: totalIngresosEfectivo + totalIngresosTransferencia + totalIngresosTarjeta - totalEgresos,
    };
  }, [movimientos, consumos]);

  const handleExportCSV = () => {
    exportToCsv(
      movimientos,
      `movimientos-caja-${periodo}`,
      [
        { key: 'fecha', label: 'Fecha' },
        { key: 'area', label: 'Área' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'origen', label: 'Origen' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'monto', label: 'Monto' },
        { key: 'metodoPago', label: 'Método de Pago' },
      ]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">Resumen de Caja</h1>
          <p className="text-muted-foreground">
            {area ? `Área: ${area.replace('_', ' ')}` : 'Todas las áreas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'ADMIN' && <IngresoInicialForm />}
          <CierreCajaButton area={area} />
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CajasResumenCards resumen={resumen} />

      {/* Movimientos sin sincronizar */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Movimientos Sin Sincronizar
              <Badge variant="default" className="bg-amber-600">
                {movimientosSinSincronizar.length}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pendientes de enviar a Caja del Hotel
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SincronizarCajaHotelButton movimientos={movimientosSinSincronizar} />
            <ExportButtons onExportCSV={handleExportCSV} disabled={movimientos.length === 0} />
          </div>
        </CardHeader>
        <CardContent>
          {movimientosSinSincronizar.length > 0 ? (
            <CajaDetalleTabla movimientos={movimientosSinSincronizar} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <p className="font-medium">Todos los movimientos están sincronizados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movimientos sincronizados */}
      {movimientosSincronizados.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                Movimientos Sincronizados
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {movimientosSincronizados.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ya enviados a Caja del Hotel
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <CajaDetalleTabla movimientos={movimientosSincronizados} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
