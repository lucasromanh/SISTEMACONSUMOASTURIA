import type { AreaConsumo, MetodoPago } from './consumos';

export interface MovimientoCaja {
  id: string;
  fecha: string;
  area: AreaConsumo;
  tipo: 'INGRESO' | 'EGRESO';
  origen: 'CONSUMO' | 'GASTO' | 'AJUSTE' | 'INICIAL' | 'VENTA';
  descripcion: string;
  monto: number;
  metodoPago?: MetodoPago;
  // Campos adicionales para sincronización con Caja del Hotel
  turno?: string; // Usuario/turno que registró
  numeroFactura?: string; // Habitación o número de factura
  razonSocial?: string; // Nombre del cliente
  sincronizado?: boolean; // Si ya fue sincronizado con Caja del Hotel
  fechaSincronizacion?: string; // Fecha y hora de sincronización
  // Datos de transferencia (solo cuando metodoPago es TRANSFERENCIA)
  datosTransferencia?: {
    hora?: string;
    aliasCbu?: string;
    banco?: string;
    numeroOperacion?: string;
    imagenComprobante?: string; // Base64 de la imagen (opcional)
  };
}

export interface DatosParaCajaHotel {
  fecha: string;
  ingreso: number;
  turno: string;
  numeroFactura: string;
  razonSocial: string;
  area: string;
  pago: string;
  total: number;
}

export interface ResumenCaja {
  totalIngresosEfectivo: number;
  totalIngresosTransferencia: number;
  totalEgresos: number;
  totalNeto: number;
}
