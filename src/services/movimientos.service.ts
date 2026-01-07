import { backendApi } from './api.service';
import { ENDPOINTS } from '@/config/api';

export interface MovimientoCajaBackend {
    id?: number;
    fecha: string;
    area: string;
    tipo: 'INGRESO' | 'EGRESO';
    origen: string;
    descripcion: string;
    monto: number;
    metodo_pago?: string;
    datos_transferencia?: any;
    sincronizado?: boolean;
    fecha_sincronizacion?: string;
}

export interface CreateMovimientoRequest {
    user_id: number;
    fecha: string;
    area: string;
    tipo: 'INGRESO' | 'EGRESO';
    origen: string;
    descripcion: string;
    monto: number;
    metodoPago?: string;
    turno?: string;
    createdBy?: string;
}

export interface ListMovimientosRequest {
    user_id?: number;
    area?: string;
    from?: string;
    to?: string;
}

class MovimientosService {
    async createMovimiento(data: CreateMovimientoRequest) {
        try {
            const response = await backendApi.post<{ success: boolean; id: number; message?: string }>(
                ENDPOINTS.MOVIMIENTOS.SAVE_MOVEMENT,
                data
            );
            return response;
        } catch (error: any) {
            console.error('Error al crear movimiento:', error);
            return {
                success: false,
                id: 0,
                message: error.response?.data?.message || 'Error al crear movimiento',
            };
        }
    }

    async listMovimientos(params: ListMovimientosRequest) {
        try {
            const response = await backendApi.get<{ success: boolean; entries: MovimientoCajaBackend[]; message?: string }>(
                ENDPOINTS.MOVIMIENTOS.GET_MOVEMENTS,
                { params: { ...params, _t: Date.now() } }
            );

            // Mapear 'entries' a 'movements' para mantener compatibilidad
            return {
                success: response.success,
                movements: response.entries || [],
                message: response.message,
            };
        } catch (error: any) {
            console.error('Error al listar movimientos:', error);
            return {
                success: false,
                movements: [],
                message: error.response?.data?.message || 'Error al listar movimientos',
            };
        }
    }

    async deleteMovimiento(id: number) {
        try {
            const response = await backendApi.post<{ success: boolean; message?: string }>(
                ENDPOINTS.MOVIMIENTOS.DELETE_MOVEMENT,
                { id }
            );
            return response;
        } catch (error: any) {
            console.error('Error al eliminar movimiento:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al eliminar movimiento',
            };
        }
    }
}

export const movimientosService = new MovimientosService();
