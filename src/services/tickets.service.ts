import { backendApi } from './api.service';
import { ENDPOINTS } from '@/config/api';
import type {
    Ticket,
    TicketItem,
    CreateTicketRequest,
    CloseTicketRequest,
    AddTicketItemRequest,
    ListTicketsRequest,
} from '@/types/tickets';

class TicketsService {
    async createTicket(data: CreateTicketRequest) {
        try {
            const response = await backendApi.post<{ success: boolean; ticket_id: number; message?: string }>(
                ENDPOINTS.TICKETS.CREATE,
                data
            );
            return response;
        } catch (error: any) {
            console.error('Error al crear ticket:', error);
            return {
                success: false,
                ticket_id: 0,
                message: error.response?.data?.message || 'Error al crear ticket',
            };
        }
    }

    async closeTicket(data: CloseTicketRequest) {
        try {
            const response = await backendApi.post<{ success: boolean; message?: string }>(
                ENDPOINTS.TICKETS.CLOSE,
                data
            );
            return response;
        } catch (error: any) {
            console.error('Error al cerrar ticket:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al cerrar ticket',
            };
        }
    }

    async addTicketItem(data: AddTicketItemRequest) {
        try {
            const response = await backendApi.post<{ success: boolean; item_id: number; message?: string }>(
                ENDPOINTS.TICKETS.ADD_ITEM,
                data
            );
            return response;
        } catch (error: any) {
            console.error('Error al agregar item al ticket:', error);
            return {
                success: false,
                item_id: 0,
                message: error.response?.data?.message || 'Error al agregar item',
            };
        }
    }

    async listTickets(params: ListTicketsRequest) {
        try {
            const response = await backendApi.get<{ success: boolean; tickets: Ticket[]; message?: string }>(
                ENDPOINTS.TICKETS.LIST,
                { params }
            );
            return response;
        } catch (error: any) {
            console.error('Error al listar tickets:', error);
            return {
                success: false,
                tickets: [],
                message: error.response?.data?.message || 'Error al listar tickets',
            };
        }
    }

    async listTicketItems(userId: number, ticketId: number) {
        try {
            const response = await backendApi.get<{ success: boolean; items: TicketItem[]; message?: string }>(
                ENDPOINTS.TICKETS.LIST_ITEMS,
                { params: { user_id: userId, ticket_id: ticketId } }
            );
            return response;
        } catch (error: any) {
            console.error('Error al listar items del ticket:', error);
            return {
                success: false,
                items: [],
                message: error.response?.data?.message || 'Error al listar items',
            };
        }
    }
}

export const ticketsService = new TicketsService();
