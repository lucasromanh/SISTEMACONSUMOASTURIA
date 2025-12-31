export type EstadoConsumo = 'CARGAR_HABITACION' | 'PAGADO' | 'PAGO_PARCIAL';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CARGAR_HABITACION' | null;

export interface DatosTarjeta {
  cuotas: number;
  numeroAutorizacion: string;
  tipoTarjeta: 'CREDITO' | 'DEBITO';
  marcaTarjeta: 'VISA' | 'MASTERCARD' | 'AMEX' | 'CABAL' | 'NARANJA' | 'MAESTRO' | string;
  numeroCupon?: string;
  estado: 'APROBADO';
  imagenComprobante?: string; // Base64 de la imagen del ticket del posnet
}

export interface DatosTransferencia {
  hora?: string;
  aliasCbu?: string;
  banco?: string;
  numeroOperacion?: string;
  imagenComprobante?: string;
}

export type AreaConsumo = 'WINNE_BAR' | 'BARRA_PILETA' | 'FINCA' | 'RESTAURANTE';

export interface PagoRegistrado {
  id: string;
  fecha: string;
  metodo: MetodoPago;
  monto: number;
  usuarioRegistroId: string;
  datosTransferencia?: DatosTransferencia;
  datosTarjeta?: DatosTarjeta;
  imagenComprobante?: string; // Base64 del comprobante (transferencia o tarjeta)
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
  ticketId?: number; // ID del ticket asociado

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
  
  // Datos de tarjeta de crédito (deprecated, usar pagos[])
  datosTarjeta?: DatosTarjeta;
  
  // Imagen del comprobante (transferencia o tarjeta)
  imagenComprobante?: string;
}