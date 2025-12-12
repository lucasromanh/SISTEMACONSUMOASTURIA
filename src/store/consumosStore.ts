import { create } from 'zustand';
import type { Consumo, AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';
import { consumosService } from '@/services/consumos.service';
import { useAuthStore } from './authStore';

interface ConsumosStore {
  consumos: Consumo[];
  loading: boolean;
  addConsumo: (consumo: Omit<Consumo, 'id'>) => Promise<boolean>;
  updateConsumo: (id: string, updates: Partial<Consumo>) => void;
  getConsumosByArea: (area: AreaConsumo) => Consumo[];
  getConsumosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => Consumo[];
  loadConsumos: (area?: AreaConsumo, from?: string, to?: string) => Promise<void>;
}

export const useConsumosStore = create<ConsumosStore>((set, get) => ({
  consumos: [],
  loading: false,

  addConsumo: async (consumoData) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('No hay usuario autenticado');
      return false;
    }

    set({ loading: true });

    try {
      // Preparar datos para el backend
      const backendData = {
        user_id: user.id,
        fecha: consumoData.fecha,
        area: consumoData.area,
        habitacion_cliente: consumoData.habitacionOCliente,
        consumo_descripcion: consumoData.consumoDescripcion,
        categoria: consumoData.categoria,
        precio_unitario: consumoData.precioUnitario,
        cantidad: consumoData.cantidad,
        estado: consumoData.estado,
        ticket_id: consumoData.ticketId, // Vincular con ticket
        metodo_pago: consumoData.metodoPago || null, // ✅ Agregar método de pago
        monto_pagado: consumoData.montoPagado || null, // ✅ Agregar monto pagado
      };

      const response = await consumosService.createConsumo(backendData);

      console.log('📦 Response createConsumo:', response);

      if (response.success) {
        // ✅ Mostrar alerta de stock si existe (desde create_consumo.php)
        if ((response as any).alerta_stock) {
          console.log('⚠️ ALERTA DE STOCK DETECTADA:', (response as any).alerta_stock);

          const { toast } = await import('@/hooks/use-toast');
          const isCritico = (response as any).alerta_stock.includes('CRÍTICO') || (response as any).alerta_stock.includes('AGOTADO');

          console.log('🔔 Mostrando toast, isCritico:', isCritico);

          toast({
            title: isCritico ? "🚨 Stock Crítico" : "⚠️ Alerta de Stock",
            description: (response as any).alerta_stock,
            variant: isCritico ? 'destructive' : 'default',
            duration: 8000,
          });
        } else {
          console.log('ℹ️ No hay alerta de stock en la respuesta');
        }

        // ✅ Recargar stock items para actualizar las alertas
        const { useStockStore } = await import('@/store/stockStore');
        useStockStore.getState().loadStockItems();

        // Crear consumo local con ID del backend
        const newConsumo: Consumo = {
          ...consumoData,
          id: response.id.toString(),
          total: response.total,
        };

        set((state) => ({
          consumos: [...state.consumos, newConsumo],
          loading: false,
        }));

        // Si está pagado, crear el pago en wb_consumo_pagos
        if (newConsumo.estado === 'PAGADO' && newConsumo.montoPagado && newConsumo.metodoPago) {
          try {
            const pagoData = {
              user_id: user.id,
              consumo_id: response.id,
              fecha: newConsumo.fecha.split('T')[0], // Solo la fecha YYYY-MM-DD
              metodo: newConsumo.metodoPago as 'EFECTIVO' | 'TRANSFERENCIA' | 'CARGAR_HABITACION',
              monto: newConsumo.montoPagado,
              // Datos de transferencia si existen
              hora: consumoData.datosTransferencia?.hora,
              alias_cbu: consumoData.datosTransferencia?.aliasCbu,
              banco: consumoData.datosTransferencia?.banco,
              numero_operacion: consumoData.datosTransferencia?.numeroOperacion,
              imagen_comprobante: consumoData.datosTransferencia?.imagenComprobante,
            };

            const pagoResponse = await consumosService.createPago(pagoData);

            console.log('🔍 RESPONSE createPago completa:', pagoResponse);

            // ✅ NUEVO: Capturar alerta de stock si existe
            if (pagoResponse.alerta_stock) {
              const { toast } = await import('@/hooks/use-toast');
              const isCritico = pagoResponse.alerta_stock.includes('CRÍTICO') || pagoResponse.alerta_stock.includes('AGOTADO');

              toast({
                title: isCritico ? "🚨 Stock Crítico" : "⚠️ Alerta de Stock",
                description: pagoResponse.alerta_stock,
                variant: isCritico ? 'destructive' : 'default',
                duration: 8000, // 8 segundos para que el usuario pueda leerlo
              });
            } else {
              console.log('ℹ️ No hay alerta de stock en la respuesta');
            }
          } catch (pagoError) {
            console.error('Error al crear pago:', pagoError);
          }
        }

        // ⚠️ NO crear movimientos de caja aquí - el backend ya lo hace en syncPagoToAreaMovementsAndCaja()
        // Esto evita duplicación de movimientos en area_movements y caja diaria

        return true;
      }

      set({ loading: false });
      return false;
    } catch (error) {
      console.error('Error al crear consumo:', error);
      set({ loading: false });
      return false;
    }
  },

  updateConsumo: (id, updates) => {
    set((state) => ({
      consumos: state.consumos.map((consumo) =>
        consumo.id === id ? { ...consumo, ...updates } : consumo
      ),
    }));

    // ⚠️ NO crear movimientos de caja aquí - el backend ya lo hace
  },

  getConsumosByArea: (area) => {
    return get().consumos.filter((c) => c.area === area);
  },

  getConsumosByDateRange: (startDate, endDate, area) => {
    return get().consumos.filter((c) => {
      // Extraer solo la parte de fecha (YYYY-MM-DD) del timestamp
      const consumoDate = c.fecha.split(' ')[0]; // "2025-12-09 00:00:00" -> "2025-12-09"
      const matchesDate = consumoDate >= startDate && consumoDate <= endDate;
      const matchesArea = area ? c.area === area : true;
      return matchesDate && matchesArea;
    });
  },

  loadConsumos: async (area, from, to) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    try {
      console.log('🔍 loadConsumos - Params:', { user_id: user.id, area, from, to });

      const response = await consumosService.listConsumos({
        user_id: user.id,
        area,
        from,
        to,
      });

      console.log('🔍 loadConsumos - Response:', response);

      if (response.success) {
        // Transformar consumos del backend al formato frontend
        const consumos: Consumo[] = response.consumos.map(c => ({
          id: c.id.toString(),
          fecha: c.fecha,
          area: c.area as AreaConsumo,
          habitacionOCliente: c.habitacion_cliente,
          consumoDescripcion: c.consumo_descripcion,
          categoria: c.categoria,
          precioUnitario: parseFloat(c.precio_unitario as any) || 0, // ✅ Parse float
          cantidad: parseFloat(c.cantidad as any) || 0, // ✅ Parse float
          total: parseFloat(c.total as any) || 0, // ✅ Parse float
          estado: c.estado as any,
          montoPagado: c.monto_pagado ? parseFloat(c.monto_pagado as any) : null, // ✅ Parse float
          metodoPago: c.metodo_pago as any, // ✅ Usar el valor del backend
          usuarioRegistroId: c.usuario_registro_id.toString(),
          ticketId: c.ticket_id ?? undefined, // ✅ Convertir null a undefined
          // ✅ NUEVO: Preservar datosTransferencia del backend
          datosTransferencia: (c as any).datosTransferencia,
        }));

        console.log('🔍 loadConsumos - Consumos transformados:', consumos.length, consumos);

        set({ consumos, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error al cargar consumos:', error);
      set({ loading: false });
    }
  },
}));

// Store separado para cajas
interface CajasStore {
  movimientos: MovimientoCaja[];
  loading: boolean;
  addMovimiento: (movimiento: Omit<MovimientoCaja, 'id'>) => Promise<boolean>;
  getMovimientosByArea: (area: AreaConsumo) => MovimientoCaja[];
  getMovimientosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => MovimientoCaja[];
  marcarComoSincronizados: (ids: string[]) => void;
  loadMovimientos: (area?: AreaConsumo, from?: string, to?: string) => Promise<void>;
}

export const useCajasStore = create<CajasStore>((set, get) => ({
  movimientos: [],
  loading: false,

  addMovimiento: async (movimientoData) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('No hay usuario autenticado');
      return false;
    }

    try {
      // Preparar datos para el backend de Caja Diaria
      const backendData = {
        user_id: user.id,
        fecha: movimientoData.fecha,
        area: movimientoData.area,
        tipo: movimientoData.tipo,
        origen: movimientoData.origen,
        descripcion: movimientoData.descripcion,
        monto: movimientoData.monto,
        metodoPago: movimientoData.metodoPago || '',
        turno: '',
        createdBy: user.username || '',
      };

      const { movimientosService } = await import('@/services/movimientos.service');
      console.log('💰 Creando movimiento:', backendData);
      const response = await movimientosService.createMovimiento(backendData);
      console.log('💰 Respuesta del backend:', response);

      if (response.success) {
        // Crear movimiento local con ID del backend
        const newMovimiento: MovimientoCaja = {
          ...movimientoData,
          id: response.id.toString(),
        };

        set((state) => ({
          movimientos: [...state.movimientos, newMovimiento],
        }));

        console.log('✅ Movimiento creado exitosamente:', newMovimiento);
        return true;
      }

      console.error('❌ Error al crear movimiento - response.success es false');
      return false;
    } catch (error) {
      console.error('❌ Error al crear movimiento:', error);
      return false;
    }
  },

  loadMovimientos: async (area?: AreaConsumo, from?: string, to?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    try {
      const { movimientosService } = await import('@/services/movimientos.service');
      const response = await movimientosService.listMovimientos({
        user_id: user.id,
        area,
        from,
        to,
      });

      if (response.success) {
        const movimientos: MovimientoCaja[] = response.movements.map((m: any) => ({
          id: m.id?.toString() || '',
          fecha: m.fecha,
          area: m.area as AreaConsumo,
          tipo: m.tipo,
          origen: m.origen,
          descripcion: m.descripcion,
          monto: parseFloat(m.monto) || 0, // ✅ Asegurar que sea número
          metodoPago: m.metodo_pago as any,
          datosTransferencia: m.datos_transferencia,
          sincronizado: m.sincronizado,
          fechaSincronizacion: m.fecha_sincronizacion,
        }));

        set({ movimientos, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      set({ loading: false });
    }
  },

  getMovimientosByArea: (area) => {
    return get().movimientos.filter((m) => m.area === area);
  },

  getMovimientosByDateRange: (startDate, endDate, area) => {
    return get().movimientos.filter((m) => {
      // Extraer solo la parte de fecha (YYYY-MM-DD) del timestamp
      const movDate = m.fecha.split(' ')[0];
      const matchesDate = movDate >= startDate && movDate <= endDate;
      const matchesArea = area ? m.area === area : true;
      return matchesDate && matchesArea;
    });
  },

  marcarComoSincronizados: (ids) => {
    const fechaSincronizacion = new Date().toISOString();
    set((state) => ({
      movimientos: state.movimientos.map((m) =>
        ids.includes(m.id)
          ? { ...m, sincronizado: true, fechaSincronizacion }
          : m
      ),
    }));
  },
}));
