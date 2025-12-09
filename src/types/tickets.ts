export interface Ticket {
    id: number;
    area: string;
    fecha_apertura: string;
    fecha_cierre?: string;
    turno: string;
    user_id: number; // ✅ CORREGIDO: La columna real es user_id, no apertura_user_id
    total_efectivo: number;
    total_transferencia: number;
    total_habitacion: number;
    total?: number; // Total general del ticket
    metodo_pago?: string; // Método de pago principal
    estado: 'ABIERTO' | 'CERRADO';
    notas?: string;
    notas_cierre?: string;
    apertura_username?: string; // Viene del JOIN con wb_users
    cierre_username?: string; // Para compatibilidad futura
    fecha?: string; // Alias para fecha_apertura (compatibilidad)
}

export interface TicketItem {
    id: number;
    ticket_id: number;
    stock_item_id?: number; // Referencia al item de stock
    descripcion: string;
    categoria?: string;
    cantidad: string | number; // Cantidad del producto
    precio_unitario: string | number; // Precio por unidad
    total: string | number; // Total del item (cantidad × precio_unitario)
    created_at?: string;
}

export interface CreateTicketRequest {
    user_id: number;
    area: string;
    fecha_apertura: string;
    turno: string;
    notas?: string;
}

export interface CloseTicketRequest {
    user_id: number;
    ticket_id: number;
    fecha_cierre: string;
    total_efectivo?: number;
    total_transferencia?: number;
    total_habitacion?: number;
    notas_cierre?: string;
}

export interface AddTicketItemRequest {
    user_id: number;
    ticket_id: number;
    tipo_item: 'CONSUMO' | 'PAGO' | 'MANUAL' | 'AJUSTE';
    referencia_id?: number;
    descripcion: string;
    monto: number;
    metodo_pago: string;
}

export interface ListTicketsRequest {
    user_id: number;
    area?: string;
    from?: string;
    to?: string;
    estado?: 'ABIERTO' | 'CERRADO';
}
