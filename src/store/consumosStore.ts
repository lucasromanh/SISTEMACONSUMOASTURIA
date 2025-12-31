import { create } from 'zustand';
import type { Consumo, AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';
import { consumosService } from '@/services/consumos.service';
import { useAuthStore } from './authStore';

interface ConsumosStore {
  consumos: Consumo[];
  addConsumo: (consumo: Omit<Consumo, 'id'>) => void;
  updateConsumo: (id: string, updates: Partial<Consumo>) => void;
  getConsumosByArea: (area: AreaConsumo) => Consumo[];
  getConsumosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => Consumo[];
  loadConsumos: (area?: AreaConsumo, startDate?: string, endDate?: string) => Promise<void>;
}

export const useConsumosStore = create<ConsumosStore>((set, get) => ({
  consumos: [],

  addConsumo: (consumoData) => {
    const newConsumo: Consumo = {
      ...consumoData,
      id: `consumo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      consumos: [...state.consumos, newConsumo],
    }));

    // Agregar movimiento de caja para todos los consumos
    const { addMovimiento } = useCajasStore.getState();
    
    if (newConsumo.estado === 'PAGADO' && newConsumo.montoPagado) {
      // Consumo pagado inmediatamente
      // No registrar movimiento duplicado si ya se registró para transferencias en pagos parciales
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
  },

  updateConsumo: (id, updates) => {
    set((state) => ({
      consumos: state.consumos.map((consumo) =>
        consumo.id === id ? { ...consumo, ...updates } : consumo
      ),
    }));

    // Si se actualiza a PAGADO, agregar movimiento de caja
    const consumoActualizado = get().consumos.find(c => c.id === id);
    if (consumoActualizado && updates.estado === 'PAGADO' && consumoActualizado.montoPagado) {
      const { addMovimiento } = useCajasStore.getState();
      addMovimiento({
        fecha: new Date().toISOString().split('T')[0], // Usar fecha actual para el pago
        area: consumoActualizado.area,
        tipo: 'INGRESO',
        origen: 'CONSUMO',
        descripcion: `Pago habitación - ${consumoActualizado.consumoDescripcion} - ${consumoActualizado.habitacionOCliente}`,
        monto: consumoActualizado.montoPagado,
        metodoPago: consumoActualizado.metodoPago || 'EFECTIVO', // Asegurar que tenga método de pago
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

  loadConsumos: async (area, startDate, endDate) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const response = await consumosService.listConsumos({
        user_id: user.id,
        area: area,
        from: startDate,
        to: endDate,
      });

      if (response.success && response.consumos) {
        const consumosFormatted: Consumo[] = response.consumos.map((c) => ({
          id: c.id.toString(),
          fecha: c.fecha.split(' ')[0],
          area: c.area as AreaConsumo,
          habitacionOCliente: c.habitacion_cliente,
          consumoDescripcion: c.consumo_descripcion,
          categoria: c.categoria,
          precioUnitario: c.precio_unitario,
          cantidad: c.cantidad,
          total: c.total,
          estado: c.estado as 'CARGAR_HABITACION' | 'PAGADO' | 'PAGO_PARCIAL',
          montoPagado: c.monto_pagado || null,
          metodoPago: c.metodo_pago as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | null,
          usuarioRegistroId: c.usuario_registro_id.toString(),
          ticketId: c.ticket_id || undefined,
        }));

        set({ consumos: consumosFormatted });
      }
    } catch (error) {
      console.error('Error al cargar consumos:', error);
    }
  },
}));

// Store separado para cajas
interface CajasStore {
  movimientos: MovimientoCaja[];
  addMovimiento: (movimiento: Omit<MovimientoCaja, 'id'>) => void;
  getMovimientosByArea: (area: AreaConsumo) => MovimientoCaja[];
  getMovimientosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => MovimientoCaja[];
  marcarComoSincronizados: (ids: string[]) => void;
  loadMovimientos: (area?: AreaConsumo, startDate?: string, endDate?: string) => Promise<void>;
}

export const useCajasStore = create<CajasStore>((set, get) => ({
  movimientos: [],

  addMovimiento: (movimientoData) => {
    const newMovimiento: MovimientoCaja = {
      ...movimientoData,
      id: `movimiento-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      movimientos: [...state.movimientos, newMovimiento],
    }));
  },

  getMovimientosByArea: (area) => {
    return get().movimientos.filter((m) => m.area === area);
  },

  getMovimientosByDateRange: (startDate, endDate, area) => {
    return get().movimientos.filter((m) => {
      const getNormalizedDate = (dateStr: string) => {
        if (dateStr.includes('-')) return dateStr;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
      const movDate = getNormalizedDate(m.fecha);
      const matchesDate = movDate >= startDate && movDate <= endDate;
      const matchesArea = area ? m.area?.toUpperCase() === area?.toUpperCase() : true;
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

  loadMovimientos: async (area, startDate, endDate) => {
    try {
      // Los movimientos se generan automáticamente desde consumos y gastos
      // Este método está disponible para futuras implementaciones si se necesita cargar desde backend
      console.log('loadMovimientos llamado - área:', area, 'desde:', startDate, 'hasta:', endDate);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
  },
}));
