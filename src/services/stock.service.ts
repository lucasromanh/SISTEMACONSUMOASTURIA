import backendApi from './api.service';
import { ENDPOINTS } from '@/config/api';

// Interfaces para stock
export interface CreateStockItemRequest {
    admin_id: number;
    area: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
}

export interface CreateStockItemResponse {
    success: boolean;
    id: number;
    message?: string;
}

export interface UpdateStockItemRequest {
    admin_id: number;
    id: number;
    area?: string;
    nombre?: string;
    categoria?: string;
    unidad?: string;
    stock_actual?: number;
    stock_minimo?: number;
}

export interface ListStockItemsRequest {
    user_id: number;
    area?: string;
}

export interface StockItemBackend {
    id: number;
    area: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
}

export interface ListStockItemsResponse {
    success: boolean;
    items: StockItemBackend[];
    message?: string;
}

class StockService {
    // Listar items de stock
    async listStockItems(params: ListStockItemsRequest): Promise<ListStockItemsResponse> {
        const response = await backendApi.post(
            ENDPOINTS.STOCK.LIST,
            params
        );

        if (response.success) {
            return {
                success: true,
                items: response.items || [],
                message: response.message,
            };
        }

        return {
            success: false,
            items: [],
            message: response.message || 'Error al listar productos',
        };
    }

    // Crear un nuevo item de stock (solo ADMIN)
    async createStockItem(data: CreateStockItemRequest): Promise<CreateStockItemResponse> {
        const response = await backendApi.post(
            ENDPOINTS.STOCK.CREATE,
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
            message: response.message || 'Error al crear producto',
        };
    }

    // Actualizar un item de stock (solo ADMIN)
    async updateStockItem(data: UpdateStockItemRequest): Promise<{ success: boolean; message?: string }> {
        const response = await backendApi.post(
            ENDPOINTS.STOCK.UPDATE,
            data
        );

        return {
            success: response.success || false,
            message: response.message,
        };
    }

    // Eliminar un item de stock (solo ADMIN)
    async deleteStockItem(adminId: number, itemId: number): Promise<{ success: boolean; message?: string }> {
        const response = await backendApi.post(
            ENDPOINTS.STOCK.DELETE,
            {
                admin_id: adminId,
                id: itemId,
            }
        );

        return {
            success: response.success || false,
            message: response.message,
        };
    }

    // Obtener alertas de stock bajo/agotado
    async getStockAlerts(area?: string): Promise<{
        success: boolean;
        alertas: Array<{
            id: number;
            area: string;
            nombre: string;
            categoria: string;
            stock_actual: number;
            stock_minimo: number;
            unidad: string;
            nivel_alerta: 'AGOTADO' | 'BAJO' | 'OK';
        }>;
        total: number;
        message?: string;
    }> {
        const params = area ? `?area=${encodeURIComponent(area)}` : '';
        const response = await backendApi.get(`${ENDPOINTS.STOCK.ALERTS}${params}`);

        return {
            success: response.success || false,
            alertas: response.alertas || [],
            total: response.total || 0,
            message: response.message,
        };
    }
}

export const stockService = new StockService();
export default stockService;
