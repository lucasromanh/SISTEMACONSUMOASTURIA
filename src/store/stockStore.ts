import { create } from 'zustand';
import type { StockItem, Gasto } from '@/types/stock';
import type { AreaConsumo } from '@/types/consumos';
import { useCajasStore } from './consumosStore';
import { stockService } from '@/services/stock.service';
import { gastosService } from '@/services/gastos.service';
import { useAuthStore } from './authStore';

interface StockStore {
  items: StockItem[];
  gastos: Gasto[];
  loading: boolean;
  addItem: (item: Omit<StockItem, 'id'>) => Promise<boolean>;
  updateItem: (id: string, item: Partial<StockItem>) => void;
  getItemsByArea: (area: AreaConsumo | 'GENERAL') => StockItem[];
  getLowStockItems: () => StockItem[];
  addGasto: (gasto: Omit<Gasto, 'id'>) => Promise<boolean>;
  getGastosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo | 'GENERAL') => Gasto[];
  loadStockItems: (area?: string) => Promise<void>;
  loadGastos: (area?: string, from?: string, to?: string) => Promise<void>;
}

export const useStockStore = create<StockStore>((set, get) => ({
  items: [],
  gastos: [],
  loading: false,

  addItem: async (itemData) => {
    const user = useAuthStore.getState().user;
    if (!user || user.role !== 'ADMIN') {
      console.error('Solo ADMIN puede crear productos');
      return false;
    }

    set({ loading: true });

    try {
      const response = await stockService.createStockItem({
        admin_id: user.id,
        area: itemData.area,
        nombre: itemData.nombre,
        categoria: itemData.categoria,
        unidad: itemData.unidad,
        stock_actual: itemData.stockActual,
        stock_minimo: itemData.stockMinimo,
      });

      if (response.success) {
        const newItem: StockItem = {
          ...itemData,
          id: response.id.toString(),
        };

        set((state) => ({
          items: [...state.items, newItem],
          loading: false,
        }));

        return true;
      }

      set({ loading: false });
      return false;
    } catch (error) {
      console.error('Error al crear producto:', error);
      set({ loading: false });
      return false;
    }
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

  addGasto: async (gastoData) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('No hay usuario autenticado');
      return false;
    }

    set({ loading: true });

    try {
      const response = await gastosService.createGasto({
        user_id: user.id,
        fecha: gastoData.fecha,
        area: gastoData.area,
        descripcion: gastoData.descripcion,
        monto: gastoData.monto,
        relacionado_stock_item_id: gastoData.relacionadoAStockItemId
          ? parseInt(gastoData.relacionadoAStockItemId)
          : undefined,
      });

      if (response.success) {
        const newGasto: Gasto = {
          ...gastoData,
          id: response.id.toString(),
        };

        set((state) => ({
          gastos: [...state.gastos, newGasto],
          loading: false,
        }));

        // Agregar movimiento de caja (egreso) - mantener lógica existente
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

        return true;
      }

      set({ loading: false });
      return false;
    } catch (error) {
      console.error('Error al crear gasto:', error);
      set({ loading: false });
      return false;
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

  loadStockItems: async (area) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    try {
      const response = await stockService.listStockItems({
        user_id: user.id,
        area,
      });

      if (response.success) {
        const items: StockItem[] = response.items.map(item => ({
          id: item.id.toString(),
          area: item.area as any,
          nombre: item.nombre,
          categoria: item.categoria,
          unidad: item.unidad,
          stockActual: item.stock_actual,
          stockMinimo: item.stock_minimo,
        }));

        set({ items, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      set({ loading: false });
    }
  },

  loadGastos: async (area, from, to) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    try {
      const response = await gastosService.listGastos({
        user_id: user.id,
        area,
        from,
        to,
      });

      if (response.success) {
        const gastos: Gasto[] = response.gastos.map(g => ({
          id: g.id.toString(),
          fecha: g.fecha,
          area: g.area as any,
          descripcion: g.descripcion,
          monto: g.monto,
          relacionadoAStockItemId: g.relacionado_stock_item_id?.toString(),
        }));

        set({ gastos, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error al cargar gastos:', error);
      set({ loading: false });
    }
  },
}));
