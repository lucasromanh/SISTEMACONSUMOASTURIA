import { forwardRef, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import type { Ticket, TicketItem } from '@/types/tickets';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import './ticket-print.css';

interface TicketReceiptProps {
    ticket: Ticket;
    items: TicketItem[];
    showActions?: boolean;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
    ({ ticket, items, showActions = true }, _ref) => {
        // ✅ CORREGIDO: Usar 'total' en lugar de 'monto' (nombre real en BD)
        const total = items.reduce((sum, item) => {
            const itemTotal = typeof item.total === 'string' ? parseFloat(item.total) : (item.total || 0);
            return sum + itemTotal;
        }, 0);

        const ticketRef = useRef<HTMLDivElement>(null);

        const handleDownloadImage = async () => {
            const element = ticketRef.current;
            if (!element) return;

            try {
                // Importar html2canvas dinámicamente
                const html2canvas = (await import('html2canvas')).default;

                // Capturar el elemento como canvas
                const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 2, // Mayor resolución
                    logging: false,
                });

                // Convertir canvas a blob
                canvas.toBlob((blob) => {
                    if (!blob) return;

                    // Crear URL y descargar
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `ticket-${ticket.id}-${Date.now()}.png`;
                    link.click();

                    // Limpiar
                    URL.revokeObjectURL(url);
                });
            } catch (error) {
                console.error('Error al descargar ticket:', error);
            }
        };

        const areaLabels: Record<string, string> = {
            WINNE_BAR: 'Winne Bar',
            BARRA_PILETA: 'Barra Pileta',
            FINCA: 'La Finca',
            RESTAURANTE: 'Restaurante',
        };

        return (
            <div className="w-full max-w-md mx-auto">
                {/* Botón de descarga */}
                {showActions && (
                    <div className="flex gap-2 mb-4">
                        <Button onClick={handleDownloadImage} className="flex-1 bg-hotel-wine-600 hover:bg-hotel-wine-700">
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Ticket
                        </Button>
                    </div>
                )}

                {/* Ticket */}
                <div
                    ref={ticketRef}
                    className="bg-white text-black p-6 rounded-lg border-2 border-gray-300 shadow-lg print:shadow-none print:border-0 print:p-0"
                    style={{ fontFamily: "'Courier New', monospace" }}
                >
                    {/* Header - Logo y datos del hotel */}
                    <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-gray-400">
                        <div className="mb-3">
                            <img
                                src="/logo-asturias.png"
                                alt="Hotel Asturias"
                                className="h-16 mx-auto mb-2"
                                onError={(e) => {
                                    // Fallback si no hay logo
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                        <h1 className="text-xl font-bold mb-1">Hotel Asturias</h1>
                        <p className="text-xs leading-relaxed">
                            Av. Gral. Güemes Sur 154<br />
                            A4427 Cafayate, Salta<br />
                            Tel: +54 3868 42 1328<br />
                            Cel: +54 9 3868 40 0835
                        </p>
                        <p className="text-xs mt-2 italic">imaginá • conozelo • disfrutalo</p>
                    </div>

                    {/* Información del ticket */}
                    <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-400">
                        <h2 className="text-center text-lg font-bold mb-3">
                            TICKET DE CONSUMO #{ticket.id}
                        </h2>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="font-semibold">Fecha:</span>
                                <span>{format(new Date(ticket.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Área:</span>
                                <span>{areaLabels[ticket.area] || ticket.area}</span>
                            </div>
                            {ticket.turno && (
                                <div className="flex justify-between">
                                    <span className="font-semibold">Atendido por:</span>
                                    <span>{ticket.turno}</span>
                                </div>
                            )}
                            {ticket.notas && (
                                <div className="mt-2">
                                    <span className="font-semibold">Cliente/Hab:</span>
                                    <span className="ml-2">{ticket.notas.replace('Hab/Cliente: ', '')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalles de consumo */}
                    <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-400">
                        <h3 className="text-center font-bold mb-3 text-sm">DETALLE DE CONSUMO</h3>
                        <div className="space-y-3">
                            {items.map((item, index) => {
                                // ✅ CORREGIDO: Usar campos reales de la BD
                                const cantidad = typeof item.cantidad === 'string' ? parseFloat(item.cantidad) : (item.cantidad || 1);
                                const precioUnitario = typeof item.precio_unitario === 'string' ? parseFloat(item.precio_unitario) : (item.precio_unitario || 0);
                                const totalItem = typeof item.total === 'string' ? parseFloat(item.total) : (item.total || 0);

                                // Extraer nombre limpio del producto (sin la cantidad)
                                const match = item.descripcion.match(/^(.+?)\s+x\d+(?:\.\d+)?$/i);
                                const nombre = match ? match[1] : item.descripcion;

                                return (
                                    <div key={item.id || index} className="text-sm">
                                        <div className="font-medium mb-1">{nombre}</div>
                                        <div className="flex justify-between text-xs">
                                            <span>
                                                {cantidad} × {formatCurrency(precioUnitario)}
                                            </span>
                                            <span className="font-bold">{formatCurrency(totalItem)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-400">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-semibold">SUBTOTAL:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            {ticket.estado === 'CERRADO' && (
                                <div className="flex justify-between text-sm mt-3 pt-2 border-t border-gray-300">
                                    <span className="font-semibold">Método de Pago:</span>
                                    <span className="uppercase">{ticket.metodo_pago || 'PENDIENTE'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs">
                        <p className="font-semibold mb-1">¡Gracias por su preferencia!</p>
                        <p className="text-gray-600">
                            {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
);

TicketReceipt.displayName = 'TicketReceipt';
