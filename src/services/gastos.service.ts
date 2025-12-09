import backendApi from './api.service';
import { ENDPOINTS } from '@/config/api';

// Interfaces para gastos
export interface CreateGastoRequest {
    user_id: number;
    fecha: string; // YYYY-MM-DD
    area: string;
    descripcion: string;
    monto: number;
    relacionado_stock_item_id?: number;
}

export interface CreateGastoResponse {
    success: boolean;
    id: number;
    message?: string;
}

export interface ListGastosRequest {
    user_id: number;
    area?: string;
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
}

export interface GastoBackend {
    id: number;
    fecha: string;
    area: string;
    descripcion: string;
    monto: number;
    relacionado_stock_item_id: number | null;
    user_id: number;
    user_username: string;
}

export interface ListGastosResponse {
    success: boolean;
    gastos: GastoBackend[];
    message?: string;
}

class GastosService {
    // Crear un nuevo gasto
    async createGasto(data: CreateGastoRequest): Promise<CreateGastoResponse> {
        const response = await backendApi.post(
            ENDPOINTS.GASTOS.CREATE,
            data
        );

        if (response.success) {
            return {
                success: true,
                id: response.id || 0,
                message: response.message,
            };
        }

        return {
            success: false,
            id: 0,
            message: response.message || 'Error al crear gasto',
        };
    }

    // Listar gastos con filtros
    async listGastos(params: ListGastosRequest): Promise<ListGastosResponse> {
        const response = await backendApi.post(
            ENDPOINTS.GASTOS.LIST,
            params
        );

        if (response.success) {
            return {
                success: true,
                gastos: response.gastos || [],
                message: response.message,
            };
        }

        return {
            success: false,
            gastos: [],
            message: response.message || 'Error al listar gastos',
        };
    }

    // Eliminar un gasto (solo ADMIN)
    async deleteGasto(adminId: number, gastoId: number): Promise<{ success: boolean; message?: string }> {
        const response = await backendApi.post(
            ENDPOINTS.GASTOS.DELETE,
            {
                admin_id: adminId,
                id: gastoId,
            }
        );

        return {
            success: response.success || false,
            message: response.message,
        };
    }
}

export const gastosService = new GastosService();
export default gastosService;
