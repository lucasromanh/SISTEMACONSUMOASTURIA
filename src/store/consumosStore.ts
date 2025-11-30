import { create } from 'zustand';
import type { Consumo, AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';

interface ConsumosStore {
  consumos: Consumo[];
  addConsumo: (consumo: Omit<Consumo, 'id'>) => void;
  getConsumosByArea: (area: AreaConsumo) => Consumo[];
  getConsumosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => Consumo[];
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
      addMovimiento({
        fecha: newConsumo.fecha,
        area: newConsumo.area,
        tipo: 'INGRESO',
        origen: 'CONSUMO',
        descripcion: `${newConsumo.consumoDescripcion} - ${newConsumo.habitacionOCliente}`,
        monto: newConsumo.montoPagado,
        metodoPago: newConsumo.metodoPago || undefined,
      });
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
}));

// Store separado para cajas
interface CajasStore {
  movimientos: MovimientoCaja[];
  addMovimiento: (movimiento: Omit<MovimientoCaja, 'id'>) => void;
  getMovimientosByArea: (area: AreaConsumo) => MovimientoCaja[];
  getMovimientosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => MovimientoCaja[];
  marcarComoSincronizados: (ids: string[]) => void;
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
