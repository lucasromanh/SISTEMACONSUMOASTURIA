import { AreaConsumo } from './consumos';

export interface StockItem {
  id: string;
  area: AreaConsumo | 'GENERAL';
  nombre: string;
  categoria: string;
  unidad: string; // botellas, unidades, kg, etc.
  stockActual: number;
  stockMinimo: number;
}

export interface Gasto {
  id: string;
  fecha: string;
  area: AreaConsumo | 'GENERAL';
  descripcion: string;
  monto: number;
  relacionadoAStockItemId?: string;
}
