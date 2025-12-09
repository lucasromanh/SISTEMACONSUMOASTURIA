import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { ConsumoForm } from '@/components/consumos/ConsumoForm';
import { ConsumosTable } from '@/components/consumos/ConsumosTable';
import { ExportButtons } from '@/components/common/ExportButtons';
import { useConsumosStore, useCajasStore } from '@/store/consumosStore';
import { useStockStore } from '@/store/stockStore';
import type { AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';
import { formatCurrency } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportToCsv';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, ShoppingCart, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AreaDashboardProps {
  area: AreaConsumo;
  titulo: string;
  productosPorCategoria: Record<string, { nombre: string; precio: number }[]>;
}

export function AreaDashboard({ area, titulo, productosPorCategoria }: AreaDashboardProps) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenComprobante, setImagenComprobante] = useState<string>('');
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<any | null>(null);

  const { consumos: allConsumos } = useConsumosStore();
  const { movimientos: allMovimientos } = useCajasStore();
  const { getGastosByDateRange } = useStockStore();

  // Convertir fecha a formato ISO para comparaciones
  const fechaISO = useMemo(() => {
    return format(fechaSeleccionada, 'yyyy-MM-dd');
  }, [fechaSeleccionada]);

  // Cargar datos del backend cuando cambia la fecha o al montar el componente
  const { loadConsumos } = useConsumosStore();
  const { loadMovimientos } = useCajasStore();

  useEffect(() => {
    // Cargar consumos del área y fecha seleccionada
    loadConsumos(area, fechaISO, fechaISO);
    // Cargar movimientos de caja del área y fecha seleccionada
    loadMovimientos(area, fechaISO, fechaISO);
  }, [fechaISO, area, loadConsumos, loadMovimientos]);

  // Filtrar consumos del dÃ­a seleccionado
  const consumos = useMemo(() => {
    return allConsumos.filter((c) => {
      const consumoDate = c.fecha.split(' ')[0];
      return consumoDate === fechaISO && c.area === area;
    });
  }, [fechaISO, area, allConsumos]);

  // Filtrar movimientos del dÃ­a seleccionado
  const movimientos = useMemo(() => {
    return allMovimientos.filter((m: MovimientoCaja) => {
      const movDate = m.fecha.split(' ')[0];
      return movDate === fechaISO && m.area === area;
    });
  }, [fechaISO, area, allMovimientos]);

  // Filtrar gastos del dÃ­a seleccionado
  const gastos = useMemo(() => {
    return getGastosByDateRange(fechaISO, fechaISO, area);
  }, [fechaISO, area, getGastosByDateRange]);

  // Crear lista de transacciones del dÃ­a ordenadas
  const transaccionesDia = useMemo(() => {
    const transacciones: Array<{
      tipo: 'INGRESO_INICIAL' | 'CONSUMO' | 'GASTO';
      hora: string;
      descripcion: string;
      monto: number;
      metodoPago?: string;
      icono: React.ReactNode;
      datosTransferencia?: any;
    }> = [];

    // Priorizar movimientos como fuente de la verdad financiera
    // 1. Ingreso inicial
    const ingresoInicial = movimientos.find((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'INICIAL');
    if (ingresoInicial) {
      transacciones.push({
        tipo: 'INGRESO_INICIAL',
        hora: '00:00',
        descripcion: `Ingreso Inicial: ${ingresoInicial.descripcion}`,
        monto: ingresoInicial.monto,
        metodoPago: 'EFECTIVO',
        icono: <ArrowUpCircle className="h-5 w-5 text-amber-600" />,
      });
    }

    // 2. Agregar movimientos (ingresos/egresos) relacionados a consumos y otros
    movimientos.forEach((m) => {
      // Saltar ingreso inicial ya agregado
      if (m.origen === 'INICIAL') return;

      const hora = new Date(m.fecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      if (m.tipo === 'INGRESO' && m.origen === 'CONSUMO') {
        transacciones.push({
          tipo: 'CONSUMO',
          hora,
          descripcion: m.descripcion,
          monto: m.monto,
          metodoPago: m.metodoPago || undefined,
          icono: <ShoppingCart className="h-5 w-5 text-green-600" />,
          datosTransferencia: m.datosTransferencia,
        });
      }

      if (m.tipo === 'EGRESO') {
        transacciones.push({
          tipo: 'GASTO',
          hora,
          descripcion: m.descripcion,
          monto: m.monto,
          metodoPago: undefined,
          icono: <ArrowDownCircle className="h-5 w-5 text-red-600" />,
        });
      }
    });

    // 3. Agregar consumos que no tengan movimiento asociado (evitar duplicados)
    consumos.forEach((c) => {
      // Buscar si existe un movimiento con la misma descripciÃ³n y monto
      const movimientoExistente = movimientos.find((m) => m.descripcion && m.descripcion.includes(c.consumoDescripcion) && Math.abs(m.monto - (c.montoPagado || c.total)) < 0.01);
      if (!movimientoExistente) {
        const hora = new Date(c.fecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        transacciones.push({
          tipo: 'CONSUMO',
          hora,
          descripcion: `${c.consumoDescripcion} - ${/^\d+$/.test(c.habitacionOCliente.trim()) ? `Hab. ${c.habitacionOCliente}` : c.habitacionOCliente} (${c.cantidad}x)`,
          monto: c.estado === 'PAGADO' ? (c.montoPagado || 0) : c.total,
          metodoPago: c.estado === 'PAGADO' ? (c.metodoPago || 'EFECTIVO') : 'CARGAR_HABITACION',
          icono: <ShoppingCart className="h-5 w-5 text-green-600" />,
          datosTransferencia: c.datosTransferencia,
        });
      }
    });

    // 4. Agregar gastos (desde stock/gastos)
    gastos.forEach((g) => {
      const hora = new Date(g.fecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      transacciones.push({
        tipo: 'GASTO',
        hora,
        descripcion: `Gasto: ${g.descripcion}`,
        monto: g.monto,
        metodoPago: 'EFECTIVO',
        icono: <ArrowDownCircle className="h-5 w-5 text-red-600" />,
      });
    });

    return transacciones;
  }, [consumos, movimientos, gastos]);

  // Calcular totales del dÃ­a
  const totalesDia = useMemo(() => {
    // Usar movimientos como fuente de verdad para totales financieros
    const ingresoInicial = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'INICIAL')
      .reduce((sum: number, m: MovimientoCaja) => sum + m.monto, 0);

    const consumosEfectivo = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && m.metodoPago === 'EFECTIVO')
      .reduce((sum, m) => sum + m.monto, 0);

    const consumosTransferencia = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && m.metodoPago === 'TRANSFERENCIA')
      .reduce((sum, m) => sum + m.monto, 0);

    // Consumos cargados a habitaciÃ³n (source: consumos o movimientos si no hay consumos)
    const consumosCargadosFromConsumos = consumos
      .filter((c) => c.estado === 'CARGAR_HABITACION')
      .reduce((sum, c) => sum + c.total, 0);

    const consumosCargadosFromMov = movimientos
      .filter((m) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && (!m.metodoPago || m.metodoPago === undefined))
      .reduce((sum, m) => sum + m.monto, 0);

    const consumosCargados = Math.max(consumosCargadosFromConsumos, consumosCargadosFromMov);

    const totalGastosFromMov = movimientos.filter((m) => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);
    const totalGastos = Math.max(totalGastosFromMov, gastos.reduce((sum, g) => sum + g.monto, 0));
    const gastosEfectivo = totalGastos;

    const totalIngresos = ingresoInicial + consumosEfectivo + consumosTransferencia;
    const saldoFinal = ingresoInicial + consumosEfectivo - gastosEfectivo;

    return {
      ingresoInicial,
      consumosEfectivo,
      consumosTransferencia,
      consumosCargados,
      totalGastos,
      gastosEfectivo,
      totalIngresos,
      saldoFinal,
    };
  }, [consumos, movimientos, gastos]);

  const handleExportCSV = () => {
    exportToCsv(
      consumos,
      `consumos-${area.toLowerCase()}-${fechaISO}`,
      [
        { key: 'fecha', label: 'Fecha' },
        { key: 'habitacionOCliente', label: 'HabitaciÃ³n/Cliente' },
        { key: 'consumoDescripcion', label: 'Consumo' },
        { key: 'categoria', label: 'CategorÃ­a' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'precioUnitario', label: 'Precio Unitario' },
        { key: 'total', label: 'Total' },
        { key: 'estado', label: 'Estado' },
        { key: 'metodoPago', label: 'MÃ©todo de Pago' },
      ]
    );
  };

  return (
    <div className="w-full bg-background">
      <div className="px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 w-full">
        {/* Header con selector de fecha */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">{titulo}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">GestiÃ³n de consumos por dÃ­a</p>
          </div>
          <div className="w-full sm:w-auto">
            <DatePicker
              date={fechaSeleccionada}
              onDateChange={setFechaSeleccionada}
              className="w-full sm:w-[280px]"
            />
          </div>
        </div>

        {/* Formulario de registro */}
        <ConsumoForm area={area} productosPorCategoria={productosPorCategoria} />

        {/* Resumen del dÃ­a */}
        <Card className="bg-gradient-to-br from-hotel-wine-50 to-hotel-wine-100 dark:from-zinc-900 dark:to-zinc-800 border-2 border-hotel-wine-200 dark:border-zinc-700 w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="line-clamp-2 sm:line-clamp-1">
                Resumen del DÃ­a - {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ingreso Inicial</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(totalesDia.ingresoInicial)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Consumos Efectivo</p>
                <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalesDia.consumosEfectivo)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Consumos Transferencia</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalesDia.consumosTransferencia)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Gastos</p>
                <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-400">-{formatCurrency(totalesDia.gastosEfectivo)}</p>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 border-t-2 border-hotel-wine-300 dark:border-zinc-600">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Efectivo Final en Caja</p>
                  <p className="text-xs text-muted-foreground mt-1">Ingreso Inicial + Consumos Efectivo - Gastos</p>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-hotel-wine-800 dark:text-hotel-wine-400">{formatCurrency(totalesDia.saldoFinal)}</p>
              </div>
            </div>

            {totalesDia.consumosCargados > 0 && (
              <div className="pt-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Cargado a HabitaciÃ³n (no incluido en caja)</p>
                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalesDia.consumosCargados)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalle de transacciones */}
        <Card className="w-full">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Detalle de Transacciones del DÃ­a</CardTitle>
            <ExportButtons onExportCSV={handleExportCSV} disabled={transaccionesDia.length === 0} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {transaccionesDia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm sm:text-base">No hay transacciones registradas para este dÃ­a</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 w-full">
                {transaccionesDia.map((transaccion, index) => (
                  <div
                    key={index}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border w-full ${transaccion.tipo === 'INGRESO_INICIAL'
                      ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                      : transaccion.tipo === 'CONSUMO'
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      }`}
                  >
                    <div className="flex items-start gap-3 flex-1 w-full">
                      <div className="flex-shrink-0">{transaccion.icono}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base break-words">{transaccion.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {transaccion.metodoPago === 'EFECTIVO' && 'ðŸ’µ Efectivo'}
                            {transaccion.metodoPago === 'TRANSFERENCIA' && 'ðŸ¦ Transferencia'}
                            {transaccion.metodoPago === 'CARGAR_HABITACION' && 'ðŸ¨ Cargado a HabitaciÃ³n'}
                          </p>
                          {transaccion.metodoPago === 'TRANSFERENCIA' && (transaccion as any).datosTransferencia?.imagenComprobante && (
                            <button
                              onClick={() => {
                                const img = (transaccion as any).datosTransferencia.imagenComprobante;
                                setImagenComprobante(img);
                                setTransaccionSeleccionada(transaccion);
                                setComprobanteModalOpen(true);
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Ver comprobante
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <p className={`text-xl sm:text-2xl font-bold ${transaccion.tipo === 'GASTO'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-green-700 dark:text-green-400'
                        }`}>
                        {transaccion.tipo === 'GASTO' ? '-' : '+'}{formatCurrency(transaccion.monto)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de Consumos con Tickets */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Consumos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsumosTable consumos={consumos} />
          </CardContent>
        </Card>
      </div>

      {/* Modal de Comprobante */}
      <Dialog open={comprobanteModalOpen} onOpenChange={setComprobanteModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                Comprobante de Transferencia
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setComprobanteModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {transaccionSeleccionada && (
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p><strong>Monto:</strong> {formatCurrency(transaccionSeleccionada.monto)}</p>
                <p><strong>Hora:</strong> {transaccionSeleccionada.hora}</p>
                {transaccionSeleccionada.datosTransferencia?.numeroOperacion && (
                  <p><strong>N° Operación:</strong> {transaccionSeleccionada.datosTransferencia.numeroOperacion}</p>
                )}
                {transaccionSeleccionada.datosTransferencia?.banco && (
                  <p><strong>Banco:</strong> {transaccionSeleccionada.datosTransferencia.banco}</p>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-[60vh]">
              <img
                src={imagenComprobante}
                alt="Comprobante de transferencia"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
