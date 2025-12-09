export interface Ticket {
    id: number;
    area: string;
    fecha_apertura: string;
    fecha_cierre?: string;
    turno: string;
    apertura_user_id: number;
    cierre_user_id?: number;
    total_efectivo: number;
    total_transferencia: number;
    total_habitacion: number;
    estado: 'ABIERTO' | 'CERRADO';
    notas?: string;
    notas_cierre?: string;
    apertura_username?: string;
    cierre_username?: string;
}

export interface TicketItem {
    id: number;
    ticket_id: number;
    tipo_item: 'CONSUMO' | 'PAGO' | 'MANUAL' | 'AJUSTE';
    referencia_id?: number;
    descripcion: string;
    monto: number;
    metodo_pago: string;
    created_at: string;
    usuario_registro_id: number;
    usuario_registro?: string;
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
