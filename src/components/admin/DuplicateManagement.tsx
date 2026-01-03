
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, RefreshCw, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DuplicateItem {
    id: number;
    created_at: string;
    estado: string;
    metodo_pago: string | null;
    es_mas_reciente?: boolean;
}

interface DuplicateGroup {
    consumo_descripcion: string;
    precio_unitario: number;
    cantidad: number;
    total: number;
    items: DuplicateItem[];
    segundos_diferencia: number;
}

interface TicketDuplicates {
    ticket_id: number;
    grupos: DuplicateGroup[];
}

export function DuplicateManagement() {
    const [duplicates, setDuplicates] = useState<TicketDuplicates[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [expandedTickets, setExpandedTickets] = useState<number[]>([]);

    // Estado para el diálogo de confirmación
    const [consumoAEliminar, setConsumoAEliminar] = useState<number | null>(null);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://sistemaconsumos.serviciosasturias.com/detect_duplicate_consumos.php');
            const data = await response.json();

            if (data.success) {
                setDuplicates(data.duplicados);
                if (data.duplicados.length === 0) {
                    toast({
                        title: "✅ Todo limpio",
                        description: "No se encontraron consumos duplicados.",
                    });
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error fetching duplicates:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los duplicados.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDuplicates();
    }, []);

    const handleDelete = async () => {
        if (!consumoAEliminar || !user) return;

        setDeletingId(consumoAEliminar);
        try {
            const response = await fetch('https://sistemaconsumos.serviciosasturias.com/soft_delete_consumo.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumo_id: consumoAEliminar,
                    user_id: user.id
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "🗑️ Eliminado",
                    description: "Consumo duplicado eliminado correctamente.",
                });
                // Recargar la lista
                fetchDuplicates();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error deleting consumo:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo eliminar el consumo.",
            });
        } finally {
            setDeletingId(null);
            setConsumoAEliminar(null);
        }
    };

    const toggleTicket = (ticketId: number) => {
        setExpandedTickets(prev =>
            prev.includes(ticketId)
                ? prev.filter(id => id !== ticketId)
                : [...prev, ticketId]
        );
    };

    if (loading && duplicates.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestión de Duplicados</h2>
                    <p className="text-muted-foreground">
                        Detecta y elimina consumos duplicados (creados con menos de 5 min de diferencia).
                    </p>
                </div>
                <Button onClick={fetchDuplicates} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Buscar Duplicados
                </Button>
            </div>

            {duplicates.length === 0 ? (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center text-green-700">
                        <CheckCircle2 className="h-12 w-12 mb-4" />
                        <h3 className="text-lg font-semibold">¡Todo limpio!</h3>
                        <p>No se detectaron consumos duplicados en el sistema.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-medium">
                            Se encontraron {duplicates.length} tickets con posibles duplicados. Revísalos cuidadosamente antes de eliminar.
                        </p>
                    </div>

                    {duplicates.map((ticket) => (
                        <Card key={ticket.ticket_id} className="overflow-hidden">
                            <CardHeader
                                className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => toggleTicket(ticket.ticket_id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {expandedTickets.includes(ticket.ticket_id) ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <CardTitle className="text-lg">Ticket #{ticket.ticket_id}</CardTitle>
                                        <Badge variant="outline">{ticket.grupos.length} grupos de duplicados</Badge>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        {expandedTickets.includes(ticket.ticket_id) ? 'Contraer' : 'Expandir'}
                                    </Button>
                                </div>
                            </CardHeader>

                            {expandedTickets.includes(ticket.ticket_id) && (
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {ticket.grupos.map((grupo, idx) => (
                                            <div key={idx} className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-lg">{grupo.consumo_descripcion}</h4>
                                                        <p className="text-muted-foreground">
                                                            {formatCurrency(grupo.precio_unitario)} x {grupo.cantidad} = {formatCurrency(grupo.total)}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="ml-2">
                                                        Diferencia: {grupo.segundos_diferencia} segs
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {grupo.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={`p-4 rounded-lg border ${item.es_mas_reciente
                                                                ? 'bg-red-50 border-red-200'
                                                                : 'bg-white border-gray-200'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-mono text-xs text-muted-foreground">ID: {item.id}</span>
                                                                        {item.es_mas_reciente && (
                                                                            <Badge variant="destructive" className="text-[10px] px-1 h-5">Más reciente</Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm font-medium">
                                                                        Creado: {format(new Date(item.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                                                                    </p>
                                                                    <div className="mt-2 text-xs space-y-1 text-muted-foreground">
                                                                        <p>Estado: {item.estado}</p>
                                                                        <p>Método: {item.metodo_pago || '-'}</p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConsumoAEliminar(item.id);
                                                                    }}
                                                                    disabled={deletingId === item.id}
                                                                >
                                                                    {deletingId === item.id ? (
                                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!consumoAEliminar} onOpenChange={(open) => !open && setConsumoAEliminar(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el consumo duplicado. El total del ticket se recalculará automáticamente.
                            Esta acción quedará registrada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
