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
}

export const stockService = new StockService();
export default stockService;
