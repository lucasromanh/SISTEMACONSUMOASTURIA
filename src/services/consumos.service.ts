import backendApi from './api.service';
import { ENDPOINTS } from '@/config/api';

// Interfaces para consumos
export interface CreateConsumoRequest {
    user_id: number;
    fecha: string; // ISO format YYYY-MM-DD HH:MM:SS
    area: string;
    habitacion_cliente: string;
    consumo_descripcion: string;
    categoria: string;
    precio_unitario: number;
    cantidad: number;
    estado: 'CARGAR_HABITACION' | 'PAGADO' | 'PAGO_PARCIAL';
    ticket_id?: number;
    metodo_pago?: string | null; // ✅ Método de pago
    monto_pagado?: number | null; // ✅ Monto pagado
    datos_tarjeta?: any; // ✅ Datos de tarjeta de crédito/débito
    imagen_comprobante?: string; // ✅ Imagen del comprobante (base64)
}

export interface CreateConsumoResponse {
    success: boolean;
    id: number;
    total: number;
    message?: string;
}

export interface ListConsumosRequest {
    user_id: number;
    area?: string;
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    estado?: string;
}

export interface ConsumoBackend {
    id: number;
    fecha: string;
    area: string;
    habitacion_cliente: string;
    consumo_descripcion: string;
    categoria: string;
    precio_unitario: number;
    cantidad: number;
    total: number;
    estado: string;
    monto_pagado: number | null;
    metodo_pago: string | null; // ✅ Agregado
    // ✅ BACKEND ENVÍA CAMELCASE (no snake_case)
    datosTarjeta?: any; // ✅ Datos de tarjeta (camelCase desde backend)
    datosTransferencia?: any; // ✅ Datos de transferencia (camelCase desde backend)
    imagen_comprobante?: string; // ✅ Imagen del comprobante
    usuario_registro_id: number;
    ticket_id: number | null;
    usuario_registro: string;
}

export interface ListConsumosResponse {
    success: boolean;
    consumos: ConsumoBackend[];
    gastos?: any[]; // ✅ Gastos incluidos en la respuesta
    message?: string;
}

// Interfaces para pagos de consumos
export interface CreatePagoRequest {
    user_id: number;
    consumo_id: number;
    fecha: string; // YYYY-MM-DD
    metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CARGAR_HABITACION';
    monto: number;
    // Datos de transferencia (opcionales)
    hora?: string;
    alias_cbu?: string;
    banco?: string;
    numero_operacion?: string;
    imagen_comprobante?: string;
    // Datos de tarjeta (opcionales)
    datos_tarjeta?: any;
}

export interface CreatePagoResponse {
    success: boolean;
    pago_id: number;
    consumo_id: number;
    monto_pagado: number;
    estado_actual: string;
    alerta_stock?: string; // ✅ Alerta de stock bajo/agotado
    message?: string;
}

export interface PagoBackend {
    id: number;
    consumo_id: number;
    fecha: string;
    metodo: string;
    monto: number;
    usuario_registro_id: number;
    hora: string | null;
    alias_cbu: string | null;
    banco: string | null;
    numero_operacion: string | null;
    imagen_comprobante: string | null;
    datos_tarjeta?: any; // ✅ Datos de tarjeta
    usuario_registro: string;
}

export interface ListPagosResponse {
    success: boolean;
    pagos: PagoBackend[];
    message?: string;
}

class ConsumosService {
    // Crear un nuevo consumo
    async createConsumo(data: CreateConsumoRequest): Promise<CreateConsumoResponse> {
        const response = await backendApi.post(
            ENDPOINTS.CONSUMOS.CREATE,
            data
        );

        if (response.success) {
            return {
                success: true,
                id: response.id || 0,
                total: response.total || 0,
                message: response.message,
            };
        }

        return {
            success: false,
            id: 0,
            total: 0,
            message: response.message || 'Error al crear consumo',
        };
    }

    // Listar consumos con filtros
    async listConsumos(params: ListConsumosRequest): Promise<ListConsumosResponse> {
        const response = await backendApi.post(
            ENDPOINTS.CONSUMOS.LIST,
            params
        );

        if (response.success) {
            return {
                success: true,
                consumos: response.consumos || [],
                message: response.message,
            };
        }

        return {
            success: false,
            consumos: [],
            message: response.message || 'Error al listar consumos',
        };
    }

    // Crear un pago para un consumo
    async createPago(data: CreatePagoRequest): Promise<CreatePagoResponse> {
        const response = await backendApi.post(
            ENDPOINTS.CONSUMO_PAGOS.CREATE,
            data
        );

        if (response.success) {
            return {
                success: true,
                pago_id: response.pago_id || 0,
                consumo_id: response.consumo_id || 0,
                monto_pagado: response.monto_pagado || 0,
                estado_actual: response.estado_actual || '',
                alerta_stock: response.alerta_stock, // ✅ Pasar alerta al frontend
                message: response.message,
            };
        }

        return {
            success: false,
            pago_id: 0,
            consumo_id: 0,
            monto_pagado: 0,
            estado_actual: '',
            message: response.message || 'Error al crear pago',
        };
    }

    // Listar pagos de un consumo
    async listPagos(userId: number, consumoId: number): Promise<ListPagosResponse> {
        const response = await backendApi.post(
            ENDPOINTS.CONSUMO_PAGOS.LIST,
            {
                user_id: userId,
                consumo_id: consumoId,
            }
        );

        if (response.success) {
            return {
                success: true,
                pagos: response.pagos || [],
                message: response.message,
            };
        }

        return {
            success: false,
            pagos: [],
            message: response.message || 'Error al listar pagos',
        };
    }
}

export const consumosService = new ConsumosService();
export default consumosService;
