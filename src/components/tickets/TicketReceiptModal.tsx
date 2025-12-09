import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TicketReceipt } from './TicketReceipt';
import { ticketsService } from '@/services/tickets.service';
import { useAuthStore } from '@/store/authStore';
import type { Ticket, TicketItem } from '@/types/tickets';
import { Loader2 } from 'lucide-react';

interface TicketReceiptModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticketId: number | null;
}

export function TicketReceiptModal({ open, onOpenChange, ticketId }: TicketReceiptModalProps) {
    const { user } = useAuthStore();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [items, setItems] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && ticketId && user) {
            loadTicketData();
        }
    }, [open, ticketId, user]);

    const loadTicketData = async () => {
        if (!ticketId || !user) return;

        setLoading(true);
        setError(null);

        try {
            // Cargar datos del ticket
            const ticketsResponse = await ticketsService.listTickets({
                user_id: user.id,
            });

            if (ticketsResponse.success) {
                const foundTicket = ticketsResponse.tickets.find((t: Ticket) => t.id === ticketId);
                if (foundTicket) {
                    setTicket(foundTicket);

                    // Cargar items del ticket
                    const itemsResponse = await ticketsService.listTicketItems(user.id, ticketId);
                    if (itemsResponse.success) {
                        setItems(itemsResponse.items);
                    }
                } else {
                    setError('Ticket no encontrado');
                }
            } else {
                setError(ticketsResponse.message || 'Error al cargar el ticket');
            }
        } catch (err) {
            console.error('Error al cargar ticket:', err);
            setError('Error al cargar los datos del ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Ticket de Consumo</DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-hotel-wine-600" />
                        <span className="ml-2">Cargando ticket...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {!loading && !error && ticket && items.length > 0 && (
                    <TicketReceipt ticket={ticket} items={items} />
                )}

                {!loading && !error && ticket && items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        Este ticket no tiene items registrados
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
