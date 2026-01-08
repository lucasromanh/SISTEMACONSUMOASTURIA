import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConsumoForm } from '@/components/consumos/ConsumoForm';
import { ConsumosTable } from '@/components/consumos/ConsumosTable';
import { ExportButtons } from '@/components/common/ExportButtons';
import { useConsumosStore, useCajasStore } from '@/store/consumosStore';
import { useStockStore } from '@/store/stockStore';
import type { AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';
import { formatCurrency } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportToCsv';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, ShoppingCart, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
interface AreaDashboardProps {
  area: AreaConsumo;
  titulo: string;
  productosPorCategoria: Record<string, { nombre: string; precio: number }[]>;
}

export function AreaDashboard({ area, titulo, productosPorCategoria }: AreaDashboardProps) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenComprobante, setImagenComprobante] = useState<string>('');
  const { consumos: allConsumos, loadConsumos } = useConsumosStore();
  const { movimientos: allMovimientos, loadMovimientos } = useCajasStore();
  const { getGastosByDateRange } = useStockStore();

  // ✅ Cargar consumos y movimientos cuando cambia la fecha o el área
  useEffect(() => {
    const fechaISO = format(fechaSeleccionada, 'yyyy-MM-dd');
    loadConsumos(area, fechaISO, fechaISO);
    loadMovimientos(area, fechaISO, fechaISO);
  }, [fechaSeleccionada, area, loadConsumos, loadMovimientos]);

  // ✅ Validar que productosPorCategoria es un objeto válido
  const hayProductosDisponibles = productosPorCategoria &&
    typeof productosPorCategoria === 'object' &&
    Object.keys(productosPorCategoria).length > 0;

  // Convertir fecha a formato ISO para comparaciones
  const fechaISO = useMemo(() => {
    return format(fechaSeleccionada, 'yyyy-MM-dd');
  }, [fechaSeleccionada]);

  // Filtrar consumos del día seleccionado
  const consumos = useMemo(() => {
    const filtered = allConsumos.filter((c) => c.fecha === fechaISO && c.area === area);
    console.log('🔍 CONSUMOS FILTRADOS:', filtered.length);

    // ✅ PARSEAR datosTarjeta si viene como string
    const consumosParsed = filtered.map(c => {
      if (c.metodoPago === 'TARJETA_CREDITO' && typeof (c as any).datosTarjeta === 'string') {
        try {
          (c as any).datosTarjeta = JSON.parse((c as any).datosTarjeta);
        } catch (e) {
          console.error('Error parseando datosTarjeta:', e);
        }
      }

      if (c.metodoPago === 'TARJETA_CREDITO') {
        console.log('💳 CONSUMO TARJETA COMPLETO:', c);
        console.log('💳 datosTarjeta:', (c as any).datosTarjeta);
        console.log('💳 tieneImagen en datosTarjeta:', !!(c as any).datosTarjeta?.imagenComprobante);
        console.log('💳 imagen_comprobante directo:', (c as any).imagen_comprobante);
      }
      return c;
    });

    return consumosParsed;
  }, [fechaISO, area, allConsumos]);

  // Filtrar movimientos del día seleccionado
  const movimientos = useMemo(() => {
    console.log('🔍 FILTRADO DE MOVIMIENTOS - Inicio');
    console.log('🔍 allMovimientos.length:', allMovimientos.length);
    console.log('🔍 fechaISO buscada:', fechaISO);
    console.log('🔍 area buscada:', area);

    const filtered = allMovimientos.filter((m: MovimientoCaja) => {
      if (!m.fecha || typeof m.fecha !== 'string') {
        console.log('❌ Movimiento sin fecha válida:', m);
        return false;
      }

      let convertedFecha: string;
      if (m.fecha.includes('-')) {
        // Ya está en formato 'yyyy-MM-dd' o 'yyyy-MM-dd HH:mm:ss'
        // ✅ FIX: Extraer solo la parte de la fecha (antes del espacio)
        convertedFecha = m.fecha.split(' ')[0];
      } else {
        // Convertir de 'dd/MM/yyyy' a 'yyyy-MM-dd'
        const parts = m.fecha.split('/');
        if (parts.length !== 3) {
          console.log('❌ Fecha con formato inválido:', m.fecha);
          return false;
        }
        const [day, month, year] = parts;
        if (!day || !month || !year) {
          console.log('❌ Partes de fecha inválidas:', { day, month, year });
          return false;
        }
        convertedFecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      const matchesFecha = convertedFecha === fechaISO;
      const matchesArea = m.area?.toUpperCase() === area?.toUpperCase();

      console.log('🔍 Movimiento:', {
        id: m.id,
        fechaOriginal: m.fecha,
        fechaConvertida: convertedFecha,
        area: m.area,
        matchesFecha,
        matchesArea,
        incluido: matchesFecha && matchesArea
      });

      return matchesFecha && matchesArea;
    });

    console.log('✅ Movimientos filtrados:', filtered.length);
    console.log('✅ Movimientos:', filtered);
    return filtered;
  }, [fechaISO, area, allMovimientos]);

  // Filtrar gastos del día seleccionado
  const gastos = useMemo(() => {
    return getGastosByDateRange(fechaISO, fechaISO, area);
  }, [fechaISO, area, getGastosByDateRange]);

  // Crear lista de transacciones del día ordenadas
  const transaccionesDia = useMemo(() => {
    const transacciones: Array<{
      tipo: 'INGRESO_INICIAL' | 'CONSUMO' | 'GASTO';
      hora: string;
      descripcion: string;
      monto: number;
      metodoPago?: string;
      icono: React.ReactNode;
      datosTransferencia?: any;
      datosTarjeta?: any;
      imagenComprobante?: string;
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

    // 2. Agregar movimientos (ingresos/egresos) - INCLUYEN datos de comprobantes
    movimientos.forEach((m) => {
      // Saltar ingreso inicial ya agregado
      if (m.origen === 'INICIAL') return;

      // Normalizar fecha para hora
      let normalizedFecha: string;
      if (m.fecha.includes('-')) {
        normalizedFecha = m.fecha;
      } else {
        const parts = m.fecha.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          normalizedFecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          normalizedFecha = m.fecha;
        }
      }

      const hora = new Date(normalizedFecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      if (m.tipo === 'INGRESO' && m.origen === 'CONSUMO') {
        // Buscar consumo correspondiente para obtener datos de comprobante
        const consumoRelacionado = consumos.find(c =>
          c.estado === 'PAGADO' &&
          Math.abs((c.montoPagado || 0) - m.monto) < 0.01 &&
          c.metodoPago === m.metodoPago
        );

        // 🐛 DEBUG: Ver qué datos tienen
        if (m.metodoPago === 'TRANSFERENCIA' || m.metodoPago === 'TARJETA_CREDITO') {
          console.log('📊 Transacción de pago:', {
            metodoPago: m.metodoPago,
            monto: m.monto,
            consumoEncontrado: !!consumoRelacionado,
            tieneDatosTransferencia: !!consumoRelacionado?.datosTransferencia,
            tieneImagenEnTransferencia: !!(consumoRelacionado?.datosTransferencia as any)?.imagenComprobante,
            tieneDatosTarjeta: !!consumoRelacionado?.datosTarjeta,
            tieneImagenDirecta: !!consumoRelacionado?.imagenComprobante,
          });
        }

        transacciones.push({
          tipo: 'CONSUMO',
          hora,
          descripcion: m.descripcion,
          monto: m.monto,
          metodoPago: m.metodoPago || 'EFECTIVO',
          icono: <ShoppingCart className="h-5 w-5 text-green-600" />,
          datosTransferencia: consumoRelacionado?.datosTransferencia,
          datosTarjeta: consumoRelacionado?.datosTarjeta,
          imagenComprobante: consumoRelacionado?.imagenComprobante,
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
      // Buscar si existe un movimiento con el mismo monto y método
      const movimientoExistente = movimientos.find((m) =>
        m.tipo === 'INGRESO' &&
        m.origen === 'CONSUMO' &&
        Math.abs(m.monto - (c.montoPagado || c.total)) < 0.01
      );

      if (!movimientoExistente && c.estado === 'PAGADO') {
        const hora = new Date(c.fecha + 'T12:00:00').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        transacciones.push({
          tipo: 'CONSUMO',
          hora,
          descripcion: `${c.consumoDescripcion} - ${/^\d+$/.test(c.habitacionOCliente.trim()) ? `Hab. ${c.habitacionOCliente}` : c.habitacionOCliente} (${c.cantidad}x)`,
          monto: c.montoPagado || 0,
          metodoPago: c.metodoPago || 'EFECTIVO',
          icono: <ShoppingCart className="h-5 w-5 text-green-600" />,
          datosTransferencia: c.datosTransferencia,
          datosTarjeta: c.datosTarjeta,
          imagenComprobante: c.imagenComprobante,
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

  // Calcular totales del día
  const totalesDia = useMemo(() => {
    console.log('🔍 AREA DASHBOARD - Calculando totales del día');
    console.log('🔍 Total movimientos:', movimientos.length);
    console.log('🔍 Total consumos:', consumos.length);
    console.log('🔍 Total gastos:', gastos.length);

    // Usar movimientos como fuente de verdad para totales financieros
    const ingresoInicial = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'INICIAL')
      .reduce((sum: number, m: MovimientoCaja) => sum + Number(m.monto || 0), 0);

    console.log('💰 Ingreso Inicial:', ingresoInicial);

    const consumosEfectivo = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && m.metodoPago === 'EFECTIVO')
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    console.log('💵 Consumos Efectivo (desde movimientos):', consumosEfectivo);

    // ✅ FIX: Si no hay movimientos de transferencia, calcular desde consumos
    const consumosTransferenciaFromMov = movimientos
      .filter((m: MovimientoCaja) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && m.metodoPago === 'TRANSFERENCIA')
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const consumosTransferenciaFromConsumos = consumos
      .filter((c) => c.estado === 'PAGADO' && c.metodoPago === 'TRANSFERENCIA')
      .reduce((sum, c) => sum + Number(c.montoPagado || c.total || 0), 0);

    const consumosTransferencia = Math.max(consumosTransferenciaFromMov, consumosTransferenciaFromConsumos);

    console.log('🏦 Consumos Transferencia (desde movimientos):', consumosTransferenciaFromMov);
    console.log('🏦 Consumos Transferencia (desde consumos):', consumosTransferenciaFromConsumos);
    console.log('🏦 Consumos Transferencia (FINAL):', consumosTransferencia);

    // ✅ CORREGIDO: Tarjeta desde CONSUMOS, no desde movimientos (no generan movimientos de caja)
    const consumosTarjeta = consumos
      .filter((c) => c.estado === 'PAGADO' && c.metodoPago === 'TARJETA_CREDITO')
      .reduce((sum, c) => sum + Number(c.montoPagado || c.total || 0), 0);

    console.log('💳 Consumos Tarjeta (desde consumos):', consumosTarjeta);

    // Consumos cargados a habitación (source: consumos o movimientos si no hay consumos)
    const consumosCargadosFromConsumos = consumos
      .filter((c) => c.estado === 'CARGAR_HABITACION')
      .reduce((sum, c) => sum + Number(c.total || 0), 0);

    const consumosCargadosFromMov = movimientos
      .filter((m) => m.tipo === 'INGRESO' && m.origen === 'CONSUMO' && (!m.metodoPago || m.metodoPago === undefined))
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const consumosCargados = Math.max(consumosCargadosFromConsumos, consumosCargadosFromMov);

    console.log('🏨 Consumos Cargados:', consumosCargados);

    const totalGastosFromMov = movimientos.filter((m) => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto || 0), 0);
    const totalGastos = Math.max(totalGastosFromMov, gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0));
    const gastosEfectivo = totalGastos;

    console.log('📉 Total Gastos:', totalGastos);

    const totalIngresos = ingresoInicial + consumosEfectivo + consumosTransferencia + consumosTarjeta;
    const saldoFinal = ingresoInicial + consumosEfectivo - gastosEfectivo;

    console.log('📊 TOTALES FINALES:', {
      ingresoInicial,
      consumosEfectivo,
      consumosTransferencia,
      consumosTarjeta,
      consumosCargados,
      totalGastos,
      gastosEfectivo,
      totalIngresos,
      saldoFinal
    });

    return {
      ingresoInicial,
      consumosEfectivo,
      consumosTransferencia,
      consumosTarjeta,
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
        { key: 'habitacionOCliente', label: 'Habitación/Cliente' },
        { key: 'consumoDescripcion', label: 'Consumo' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'precioUnitario', label: 'Precio Unitario' },
        { key: 'total', label: 'Total' },
        { key: 'estado', label: 'Estado' },
        { key: 'metodoPago', label: 'Método de Pago' },
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
            <p className="text-sm sm:text-base text-muted-foreground">Gestión de consumos por día</p>
          </div>
          <div className="w-full sm:w-auto">
            <DatePicker
              date={fechaSeleccionada}
              onDateChange={setFechaSeleccionada}
              className="w-full sm:w-[280px]"
            />
          </div>
        </div>

        {/* ✅ Mensaje de alerta si no hay productos disponibles */}
        {!hayProductosDisponibles && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin productos disponibles</AlertTitle>
            <AlertDescription>
              No hay productos cargados para esta área. Contacta al administrador para agregar productos al stock.
            </AlertDescription>
          </Alert>
        )}

        {/* Formulario de registro */}
        <ConsumoForm area={area} productosPorCategoria={productosPorCategoria} />

        {/* Resumen del día */}
        <Card className="bg-gradient-to-br from-hotel-wine-50 to-hotel-wine-100 dark:from-zinc-900 dark:to-zinc-800 border-2 border-hotel-wine-200 dark:border-zinc-700 w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="line-clamp-2 sm:line-clamp-1">
                Resumen del Día - {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
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
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Consumos Tarjeta</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-400">{formatCurrency(totalesDia.consumosTarjeta)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 w-full">
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
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Cargado a Habitación (no incluido en caja)</p>
                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalesDia.consumosCargados)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalle de transacciones */}
        <Card className="w-full">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Detalle de Transacciones del Día</CardTitle>
            <ExportButtons onExportCSV={handleExportCSV} disabled={transaccionesDia.length === 0} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {transaccionesDia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm sm:text-base">No hay transacciones registradas para este día</p>
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
                            {transaccion.metodoPago === 'EFECTIVO' && '💵 Efectivo'}
                            {transaccion.metodoPago === 'TRANSFERENCIA' && '🏦 Transferencia'}
                            {transaccion.metodoPago === 'TARJETA_CREDITO' && '💳 Tarjeta'}
                            {transaccion.metodoPago === 'CARGAR_HABITACION' && '🏨 Cargado a Habitación'}
                          </p>
                          {transaccion.metodoPago === 'TRANSFERENCIA' && (transaccion as any).datosTransferencia?.imagenComprobante && (
                            <button
                              onClick={() => {
                                const img = (transaccion as any).datosTransferencia.imagenComprobante;
                                setImagenComprobante(img);
                                setComprobanteModalOpen(true);
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Ver comprobante
                            </button>
                          )}
                          {transaccion.metodoPago === 'TARJETA_CREDITO' && (transaccion as any).datosTarjeta?.imagenComprobante && (
                            <button
                              onClick={() => {
                                console.log('🖼️ TARJETA - datosTarjeta completo:', (transaccion as any).datosTarjeta);
                                const img = (transaccion as any).datosTarjeta.imagenComprobante;
                                console.log('🖼️ TARJETA - Imagen:', img?.substring(0, 50));
                                setImagenComprobante(img);
                                setComprobanteModalOpen(true);
                              }}
                              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              Ver comprobante posnet
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

        {/* Consumos del Día */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Consumos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsumosTable consumos={consumos} />
          </CardContent>
        </Card>

        {/* Modal de Comprobante */}
        <Dialog open={comprobanteModalOpen} onOpenChange={setComprobanteModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Comprobante de Pago</DialogTitle>
            </DialogHeader>
            <div className="relative w-full overflow-auto flex-1">
              <img
                src={imagenComprobante}
                alt="Comprobante"
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `comprobante-${Date.now()}.png`;
                  link.href = imagenComprobante;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Descargar
              </Button>
              <Button onClick={() => setComprobanteModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
