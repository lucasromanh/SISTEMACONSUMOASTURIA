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
      };

      const response = await consumosService.createConsumo(backendData);

      if (response.success) {
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

        // Agregar movimiento de caja para todos los consumos (mantener lógica existente)
        const { addMovimiento } = useCajasStore.getState();

        if (newConsumo.estado === 'PAGADO' && newConsumo.montoPagado) {
          // Consumo pagado inmediatamente
          const yaRegistradoTransferencia = newConsumo.pagos?.some(p => p.metodo === 'TRANSFERENCIA') ?? false;
          if (!yaRegistradoTransferencia) {
            addMovimiento({
              fecha: newConsumo.fecha,
              area: newConsumo.area,
              tipo: 'INGRESO',
              origen: 'CONSUMO',
              descripcion: `${newConsumo.consumoDescripcion} - ${newConsumo.habitacionOCliente}`,
              monto: newConsumo.montoPagado,
              metodoPago: newConsumo.metodoPago || 'EFECTIVO',
            });
          }
        } else if (newConsumo.estado === 'CARGAR_HABITACION') {
          // Consumo cargado a habitación (pendiente de cobro)
          addMovimiento({
            fecha: newConsumo.fecha,
            area: newConsumo.area,
            tipo: 'INGRESO',
            origen: 'CONSUMO',
            descripcion: `${newConsumo.consumoDescripcion} - Hab. ${newConsumo.habitacionOCliente} (Pendiente)`,
            monto: newConsumo.total,
            metodoPago: undefined,
          });
        }

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

    // Si se actualiza a PAGADO, agregar movimiento de caja (mantener lógica existente)
    const consumoActualizado = get().consumos.find(c => c.id === id);
    if (consumoActualizado && updates.estado === 'PAGADO' && consumoActualizado.montoPagado) {
      const { addMovimiento } = useCajasStore.getState();
      addMovimiento({
        fecha: new Date().toISOString().split('T')[0],
        area: consumoActualizado.area,
        tipo: 'INGRESO',
        origen: 'CONSUMO',
        descripcion: `Pago habitación - ${consumoActualizado.consumoDescripcion} - ${consumoActualizado.habitacionOCliente}`,
        monto: consumoActualizado.montoPagado,
        metodoPago: consumoActualizado.metodoPago || 'EFECTIVO',
      });
    }
  },

  getConsumosByArea: (area) => {
    return get().consumos.filter((c) => c.area === area);
  },

  getConsumosByDateRange: (startDate, endDate, area) => {
    return get().consumos.filter((c) => {
      const consumoDate = c.fecha;
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
      const response = await consumosService.listConsumos({
        user_id: user.id,
        area,
        from,
        to,
      });

      if (response.success) {
        // Transformar consumos del backend al formato frontend
        const consumos: Consumo[] = response.consumos.map(c => ({
          id: c.id.toString(),
          fecha: c.fecha,
          area: c.area as AreaConsumo,
          habitacionOCliente: c.habitacion_cliente,
          consumoDescripcion: c.consumo_descripcion,
          categoria: c.categoria,
          precioUnitario: c.precio_unitario,
          cantidad: c.cantidad,
          total: c.total,
          estado: c.estado as any,
          montoPagado: c.monto_pagado,
          metodoPago: null, // Deprecated
          usuarioRegistroId: c.usuario_registro_id.toString(),
        }));

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
      const response = await movimientosService.createMovimiento(backendData);

      if (response.success) {
        // Crear movimiento local con ID del backend
        const newMovimiento: MovimientoCaja = {
          ...movimientoData,
          id: response.id.toString(),
        };

        set((state) => ({
          movimientos: [...state.movimientos, newMovimiento],
        }));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error al crear movimiento:', error);
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
          monto: m.monto,
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
      const movDate = m.fecha;
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
