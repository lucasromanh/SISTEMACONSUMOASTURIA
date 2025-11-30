export type EstadoConsumo = 'CARGAR_HABITACION' | 'PAGADO' | 'PAGO_PARCIAL';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | null;

export type AreaConsumo = 'WINNE_BAR' | 'BARRA_PILETA' | 'FINCA' | 'RESTAURANTE';

export interface PagoRegistrado {
  id: string;
  fecha: string;
  metodo: MetodoPago;
  monto: number;
  usuarioRegistroId: string;
  datosTransferencia?: {
    hora?: string;
    aliasCbu?: string;
    banco?: string;
    numeroOperacion?: string;
    imagenComprobante?: string;
  };
}

export interface Consumo {
  id: string;
  fecha: string; // ISO
  area: AreaConsumo;
  habitacionOCliente: string;
  consumoDescripcion: string;
  categoria: string; // café, trago, gaseosa, whisky, tostado, licuado, agua, comida, etc.
  precioUnitario: number;
  cantidad: number;
  total: number;
  estado: EstadoConsumo;
  montoPagado: number | null;
  metodoPago: MetodoPago; // Método principal (deprecated, usar pagos[])
  usuarioRegistroId: string; // user id
  
  // Sistema de pagos múltiples
  pagos?: PagoRegistrado[];
  
  // Datos de transferencia (deprecated, usar pagos[])
  datosTransferencia?: {
    hora?: string;
    aliasCbu?: string;
    banco?: string;
    numeroOperacion?: string;
    imagenComprobante?: string;
  };
}
