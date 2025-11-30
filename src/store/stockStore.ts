import { create } from 'zustand';
import type { StockItem, Gasto } from '@/types/stock';
import type { AreaConsumo } from '@/types/consumos';
import { useCajasStore } from './consumosStore';

interface StockStore {
  items: StockItem[];
  gastos: Gasto[];
  addItem: (item: Omit<StockItem, 'id'>) => void;
  updateItem: (id: string, item: Partial<StockItem>) => void;
  getItemsByArea: (area: AreaConsumo | 'GENERAL') => StockItem[];
  getLowStockItems: () => StockItem[];
  addGasto: (gasto: Omit<Gasto, 'id'>) => void;
  getGastosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo | 'GENERAL') => Gasto[];
}

export const useStockStore = create<StockStore>((set, get) => ({
  items: [
    // Items de ejemplo
    {
      id: '1',
      area: 'WINNE_BAR',
      nombre: 'Coca-Cola 500ml',
      categoria: 'Gaseosas',
      unidad: 'botellas',
      stockActual: 48,
      stockMinimo: 24,
    },
    {
      id: '2',
      area: 'WINNE_BAR',
      nombre: 'Café en grano',
      categoria: 'Café',
      unidad: 'kg',
      stockActual: 3,
      stockMinimo: 5,
    },
    {
      id: '3',
      area: 'BARRA_PILETA',
      nombre: 'Ron Havana Club',
      categoria: 'Licores',
      unidad: 'botellas',
      stockActual: 12,
      stockMinimo: 6,
    },
    {
      id: '4',
      area: 'RESTAURANTE',
      nombre: 'Vino Malbec',
      categoria: 'Vinos',
      unidad: 'botellas',
      stockActual: 24,
      stockMinimo: 12,
    },
  ],
  gastos: [],

  addItem: (itemData) => {
    const newItem: StockItem = {
      ...itemData,
      id: `stock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      items: [...state.items, newItem],
    }));
  },

  updateItem: (id, itemData) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...itemData } : item)),
    }));
  },

  getItemsByArea: (area) => {
    return get().items.filter((item) => item.area === area || item.area === 'GENERAL');
  },

  getLowStockItems: () => {
    return get().items.filter((item) => item.stockActual < item.stockMinimo);
  },

  addGasto: (gastoData) => {
    const newGasto: Gasto = {
      ...gastoData,
      id: `gasto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      gastos: [...state.gastos, newGasto],
    }));

    // Agregar movimiento de caja (egreso)
    if (gastoData.area !== 'GENERAL') {
      const { addMovimiento } = useCajasStore.getState();
      addMovimiento({
        fecha: newGasto.fecha,
        area: newGasto.area as AreaConsumo,
        tipo: 'EGRESO',
        origen: 'GASTO',
        descripcion: newGasto.descripcion,
        monto: newGasto.monto,
      });
    }
  },

  getGastosByDateRange: (startDate, endDate, area) => {
    return get().gastos.filter((g) => {
      const gastoDate = g.fecha;
      const matchesDate = gastoDate >= startDate && gastoDate <= endDate;
      const matchesArea = area ? g.area === area : true;
      return matchesDate && matchesArea;
    });
  },
}));
