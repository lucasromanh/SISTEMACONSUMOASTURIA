import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useConsumosStore, useCajasStore } from '@/store/consumosStore';
import { getDateRangeByPeriod } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';
import { ConsumosTable } from '@/components/consumos/ConsumosTable';
import { CajaDetalleTabla } from '@/components/cajas/CajaDetalleTabla';
import { UserManagement } from '@/components/admin/UserManagement';
import { DollarSign, TrendingUp, Wallet, BarChart, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StockAlerts } from '@/components/stock/StockAlerts';

type PeriodoPreset = 'day' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'custom';

export function AdminDashboardPage() {
  const [periodo, setPeriodo] = useState<PeriodoPreset>('day');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const { getConsumosByDateRange, consumos: allConsumos, loadConsumos } = useConsumosStore();
  const { getMovimientosByDateRange, movimientos: allMovimientos, loadMovimientos } = useCajasStore();

  const dateRange = useMemo(() => {
    if (periodo === 'custom' && customStartDate && customEndDate) {
      return {
        start: format(customStartDate, 'yyyy-MM-dd'),
        end: format(customEndDate, 'yyyy-MM-dd'),
      };
    }

    if (periodo === 'lastWeek') {
      const today = new Date();
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay()); // Domingo de esta semana
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // Sábado de semana pasada

      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Lunes de semana pasada

      return {
        start: format(lastWeekStart, 'yyyy-MM-dd'),
        end: format(lastWeekEnd, 'yyyy-MM-dd'),
      };
    }

    if (periodo === 'lastMonth') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      return {
        start: format(lastMonth, 'yyyy-MM-dd'),
        end: format(lastMonthEnd, 'yyyy-MM-dd'),
      };
    }

    return getDateRangeByPeriod(periodo as 'day' | 'week' | 'month');
  }, [periodo, customStartDate, customEndDate]);

  // Cargar datos del backend cuando cambia el rango de fechas
  useEffect(() => {
    // Cargar consumos de todas las áreas para el rango de fechas
    loadConsumos(undefined, dateRange.start, dateRange.end);
    // Cargar movimientos de todas las áreas para el rango de fechas
    loadMovimientos(undefined, dateRange.start, dateRange.end);
  }, [dateRange.start, dateRange.end, loadConsumos, loadMovimientos]);

  const consumos = useMemo(() => {
    const result = getConsumosByDateRange(dateRange.start, dateRange.end);
    console.log('📊 Dashboard - Consumos cargados:', result.length, result);
    console.log('📊 Dashboard - Áreas únicas:', [...new Set(result.map(c => c.area))]);
    return result;
  }, [dateRange, getConsumosByDateRange, allConsumos]);

  const movimientos = useMemo(() => {
    return getMovimientosByDateRange(dateRange.start, dateRange.end);
  }, [dateRange, getMovimientosByDateRange, allMovimientos]);

  const statsByArea = useMemo(() => {
    const areas = ['WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE'] as const;
    return areas.map((area) => {
      const areaConsumos = consumos.filter((c) => c.area === area);

      // ✅ FIX: Convertir strings a números antes de sumar
      const total = areaConsumos.reduce((sum, c) => sum + Number(c.total || 0), 0);
      const totalPagado = areaConsumos
        .filter((c) => c.estado === 'PAGADO')
        .reduce((sum, c) => sum + Number(c.montoPagado || c.total || 0), 0);
      const totalHabitacion = areaConsumos
        .filter((c) => c.estado === 'CARGAR_HABITACION')
        .reduce((sum, c) => sum + Number(c.total || 0), 0);

      return {
        area,
        total,
        totalPagado,
        totalHabitacion,
        cantidad: areaConsumos.length,
      };
    });
  }, [consumos]);

  const globalStats = useMemo(() => {
    console.log('📊 ADMIN DASHBOARD - Calculando globalStats');
    console.log('📊 Total consumos para cálculo:', consumos.length);
    console.log('📊 Consumos detalle:', consumos.map(c => ({
      id: c.id,
      area: c.area,
      estado: c.estado,
      total: c.total,
      montoPagado: c.montoPagado,
      metodoPago: c.metodoPago
    })));

    // ✅ FIX: Convertir strings a números antes de sumar
    const total = consumos.reduce((sum, c) => sum + Number(c.total || 0), 0);
    console.log('📊 TOTAL VENTAS calculado:', total);

    const consumosPagados = consumos.filter((c) => c.estado === 'PAGADO');
    console.log('📊 Consumos PAGADOS:', consumosPagados.length, consumosPagados.map(c => ({
      id: c.id,
      montoPagado: c.montoPagado,
      total: c.total
    })));

    // ✅ FIX: Convertir strings a números antes de sumar
    const totalPagado = consumosPagados.reduce((sum, c) => sum + Number(c.montoPagado || c.total || 0), 0);
    console.log('📊 TOTAL COBRADO calculado:', totalPagado);

    const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO');
    const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

    const totalIngresos = ingresos.reduce((sum, m) => sum + Number(m.monto || 0), 0);
    const totalEgresos = egresos.reduce((sum, m) => sum + Number(m.monto || 0), 0);

    // ✅ Balance en Caja = Ventas Cobradas - Gastos
    // Esto representa el dinero real que tienes en caja después de pagar gastos
    const totalNeto = totalPagado - totalEgresos;

    // ✅ Balance Proyectado = Total Ventas - Gastos
    // Incluye ventas pendientes de cobro (cargar a habitación)
    const totalNetoProyectado = total - totalEgresos;

    console.log('📊 RESUMEN FINAL:', {
      total,
      totalPagado,
      totalIngresos,
      totalEgresos,
      totalNeto,
      totalNetoProyectado
    });

    return {
      total,
      totalPagado,
      totalIngresos,
      totalEgresos,
      totalNeto,
      totalNetoProyectado,
    };
  }, [consumos, movimientos]);

  const areaLabels: Record<string, string> = {
    WINNE_BAR: 'Winne Bar',
    BARRA_PILETA: 'Barra Pileta',
    FINCA: 'La Finca',
    RESTAURANTE: 'Restaurante',
  };

  return (
    <div className="w-full bg-background">
      <div className="px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 w-full">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">Dashboard Global</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Vista general de todas las áreas</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoPreset)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">📅 Hoy</SelectItem>
                  <SelectItem value="week">📆 Esta Semana</SelectItem>
                  <SelectItem value="lastWeek">⏪ Semana Anterior</SelectItem>
                  <SelectItem value="month">📅 Este Mes</SelectItem>
                  <SelectItem value="lastMonth">⏪ Mes Anterior</SelectItem>
                  <SelectItem value="custom">🗓️ Rango Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {periodo === 'custom' && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[200px] justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "d 'de' MMM", { locale: es }) : "Fecha inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[200px] justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "d 'de' MMM", { locale: es }) : "Fecha fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Mostrar rango de fechas seleccionado */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              Mostrando datos del {format(new Date(dateRange.start), "d 'de' MMMM 'de' yyyy", { locale: es })}
              {' '} al {format(new Date(dateRange.end), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <DollarSign className="h-4 w-4 text-hotel-wine-600 dark:text-hotel-wine-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-hotel-wine-800 dark:text-hotel-wine-300">
                {formatCurrency(globalStats.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{consumos.length} consumos</p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(globalStats.totalPagado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ventas cobradas</p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
              <Wallet className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {formatCurrency(globalStats.totalEgresos)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Gastos del período</p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance en Caja</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(globalStats.totalNeto)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cobrado - Gastos</p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Proyectado</CardTitle>
              <BarChart className="h-4 w-4 text-hotel-gold-600 dark:text-hotel-gold-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-hotel-gold-700 dark:text-hotel-gold-400">
                {formatCurrency(globalStats.totalNetoProyectado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Ventas - Gastos</p>
            </CardContent>
          </Card>
        </div>

        {/* ✅ NUEVO: Alertas de stock de todas las áreas */}
        <StockAlerts showOnlyArea={false} />

        <div className="w-full">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Resumen por Área</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            {statsByArea.map((stat) => (
              <Card key={stat.area} className="hover:shadow-lg transition-shadow w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs sm:text-sm">{areaLabels[stat.area]}</Badge>
                    <span className="text-xs text-muted-foreground">{stat.cantidad} ventas</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total:</span>
                      <span className="text-base sm:text-lg font-bold">{formatCurrency(stat.total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs sm:text-sm text-green-700 dark:text-green-400">Pagado:</span>
                      <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(stat.totalPagado)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">Habitación:</span>
                      <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {formatCurrency(stat.totalHabitacion)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Tabs defaultValue="resumen" className="space-y-3 sm:space-y-4 w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="resumen" className="text-xs sm:text-sm">Resumen</TabsTrigger>
            <TabsTrigger value="consumos" className="text-xs sm:text-sm">Consumos</TabsTrigger>
            <TabsTrigger value="usuarios" className="text-xs sm:text-sm">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <Tabs defaultValue="consumos" className="space-y-3 sm:space-y-4 w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="consumos" className="text-xs sm:text-sm">Todos los Consumos</TabsTrigger>
                <TabsTrigger value="movimientos" className="text-xs sm:text-sm">Movimientos de Caja</TabsTrigger>
              </TabsList>
              <TabsContent value="consumos">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Consumos de Todas las Áreas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ConsumosTable consumos={consumos} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="movimientos">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Movimientos de Caja de Todas las Áreas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <CajaDetalleTabla movimientos={movimientos} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="consumos">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Consumos de Todas las Áreas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ConsumosTable consumos={consumos} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
