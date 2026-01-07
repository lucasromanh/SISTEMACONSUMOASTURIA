const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/backend';

export interface Movement {
    id: string;
    fecha: string;
    area: string;
    tipo: 'INGRESO' | 'EGRESO';
    origen: string;
    descripcion: string;
    monto: number;
    metodo_pago: string | null;
    user_id: number;
    created_at: string;
    sincronizado: boolean;
    fecha_sincronizacion: string | null;
    source: 'M' | 'C' | 'G'; // M=Movement, C=Consumo, G=Gasto
}

export interface GetMovementsParams {
    user_id: number;
    area?: string;
    from?: string;
    to?: string;
    sincronizado?: 0 | 1;
}

export interface SyncResponse {
    success: boolean;
    synced: number;
    total: number;
    errors: string[];
    message: string;
}

export const hotelCashSyncService = {
    // Obtener movimientos no sincronizados
    getUnsyncedMovements: async (params: GetMovementsParams): Promise<{ success: boolean; entries: Movement[] }> => {
        const query = new URLSearchParams({
            user_id: params.user_id.toString(),
            sincronizado: '0',
            ...(params.area && { area: params.area }),
            ...(params.from && { from: params.from }),
            ...(params.to && { to: params.to })
        });

        const res = await fetch(`${API_URL}/get_area_movements.php?${query}`);
        return await res.json();
    },

    // Sincronizar al sistema externo
    syncToHotelCash: async (params: { user_id: number; area?: string }): Promise<SyncResponse> => {
        const res = await fetch(`${API_URL}/process_integration.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return await res.json();
    },

    // Obtener movimientos sincronizados (historial)
    getSyncedMovements: async (params: GetMovementsParams): Promise<{ success: boolean; entries: Movement[] }> => {
        const query = new URLSearchParams({
            user_id: params.user_id.toString(),
            sincronizado: '1',
            ...(params.area && { area: params.area }),
            ...(params.from && { from: params.from }),
            ...(params.to && { to: params.to })
        });

        const res = await fetch(`${API_URL}/get_area_movements.php?${query}`);
        return await res.json();
    }
};
