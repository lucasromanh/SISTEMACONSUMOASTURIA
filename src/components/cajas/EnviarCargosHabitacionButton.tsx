import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, FileText, Loader2, BedDouble } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useConsumosStore } from '@/store/consumosStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getDateRangeByPeriod } from '@/utils/dateHelpers';
import type { AreaConsumo, Consumo } from '@/types/consumos';

interface EnviarCargosHabitacionButtonProps {
    variant?: 'default' | 'outline';
    area?: AreaConsumo;
}

interface DetalleHabitacion {
    habitacion: string;
    total: number;
    consumos: Consumo[];
}

export function EnviarCargosHabitacionButton({ variant = 'default', area }: EnviarCargosHabitacionButtonProps) {
    const [open, setOpen] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [imagenGenerada, setImagenGenerada] = useState<string | null>(null);
    const cierreRef = useRef<HTMLDivElement>(null);
    const { user } = useAuthStore();
    const { getConsumosByDateRange, loadConsumos } = useConsumosStore();
    const { toast } = useToast();

    const { start, end } = getDateRangeByPeriod('day');

    // Cargar consumos al abrir el modal
    useEffect(() => {
        if (open) {
            loadConsumos(area, start, end);
        }
    }, [open, area, start, end, loadConsumos]);

    const allConsumos = getConsumosByDateRange(start, end, area);

    // Filtrar solo cargas a habitación
    const cargasHabitacion = allConsumos
        .filter((c) => c.estado === 'CARGAR_HABITACION')
        .reduce((acc, curr) => {
            const existing = acc.find(item => item.habitacion === curr.habitacionOCliente);
            if (existing) {
                existing.total += curr.total;
                existing.consumos.push(curr);
            } else {
                acc.push({
                    habitacion: curr.habitacionOCliente,
                    total: curr.total,
                    consumos: [curr]
                });
            }
            return acc;
        }, [] as DetalleHabitacion[]);

    // Ordenar por número de habitación
    cargasHabitacion.sort((a, b) => {
        // Intentar comparar como números si son numéricos
        const numA = parseInt(a.habitacion.replace(/\D/g, ''));
        const numB = parseInt(b.habitacion.replace(/\D/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.habitacion.localeCompare(b.habitacion);
    });

    const totalGeneral = cargasHabitacion.reduce((sum, c) => sum + c.total, 0);

    // Generar imagen
    const handleGenerarImagen = async () => {
        if (!cierreRef.current) return;

        try {
            const dataUrl = await toPng(cierreRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });
            setImagenGenerada(dataUrl);
        } catch (error) {
            console.error('Error generando imagen:', error);
            toast({
                variant: 'destructive',
                title: '❌ Error',
                description: 'No se pudo generar la imagen del reporte',
            });
        }
    };

    // Enviar por WhatsApp
    const handleEnviarWhatsApp = async () => {
        if (!imagenGenerada) {
            await handleGenerarImagen();
            setTimeout(() => {
                handleEnviarWhatsApp();
            }, 500);
            return;
        }

        setEnviando(true);

        try {
            const numeroWhatsApp = '5493868400835'; // +54 9 3868 40-0835
            const mensaje = encodeURIComponent(
                `*Reporte de Consumos a Habitación - ${areaLabel}*\n` +
                `📅 Fecha: ${formatDate(start)}\n` +
                `👤 Usuario: ${user?.displayName || 'Sistema'}\n\n` +
                (cargasHabitacion.length > 0 ?
                    cargasHabitacion.map(c =>
                        `*Hab. ${c.habitacion}* (${formatCurrency(c.total)})\n` +
                        c.consumos.map(item => `  • ${item.consumoDescripcion} (${item.cantidad}x)`).join('\n')
                    ).join('\n\n') +
                    `\n\n💰 *TOTAL CARGAS: ${formatCurrency(totalGeneral)}*`
                    : 'No hay cargos a habitación pendientes.'
                )
            );

            const response = await fetch(imagenGenerada);
            const blob = await response.blob();
            const file = new File([blob], `cargos-habitacion-${formatDate(start)}.png`, { type: 'image/png' });

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile && navigator.share && navigator.canShare) {
                try {
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Cargos a Habitación',
                            text: `Cargos a Habitación - ${areaLabel}`,
                        });

                        toast({
                            title: '✅ Compartido',
                            description: 'Imagen compartida exitosamente',
                        });
                        setOpen(false);
                        setEnviando(false);
                        return;
                    }
                } catch (shareError) {
                    console.log('Usuario canceló o error en Web Share API');
                }
            }

            const link = document.createElement('a');
            link.download = `cargos-habitacion-${formatDate(start)}.png`;
            link.href = imagenGenerada;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank');
            }, 500);

            toast({
                title: '✅ Listo!',
                description: 'Imagen descargada. Adjúntala en WhatsApp y envía el mensaje.',
                duration: 8000,
            });

            setOpen(false);
        } catch (error) {
            console.error('Error enviando:', error);
            toast({
                variant: 'destructive',
                title: '❌ Error',
                description: 'No se pudo procesar el envío',
            });
        } finally {
            setEnviando(false);
        }
    };

    const areaLabel = area ? area.replace('_', ' ') : 'General';

    const handleOpenDialog = () => {
        setOpen(true);
        setImagenGenerada(null);
        setTimeout(() => {
            handleGenerarImagen();
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={variant}
                    size="sm"
                    className="gap-2 w-full justify-start"
                    onClick={handleOpenDialog}
                >
                    <BedDouble className="h-4 w-4" />
                    Enviar Cargos de Habitación
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BedDouble className="h-5 w-5" />
                        Cargos a Habitación - Detalle
                    </DialogTitle>
                    <DialogDescription>
                        Detalle de consumos para enviar a recepción
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div
                        ref={cierreRef}
                        className="bg-white p-8 rounded-lg space-y-6"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-4">
                            <h1 className="text-2xl font-bold text-gray-900">Hotel Asturias</h1>
                            <h2 className="text-xl font-semibold text-gray-700 mt-1">Reporte de Cargos a Habitación</h2>
                            <p className="text-sm text-gray-600 mt-2">
                                Área: <span className="font-bold">{areaLabel}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Fecha: <span className="font-bold">{formatDate(start)}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Usuario: <span className="font-bold">{user?.displayName || 'Sistema'}</span>
                            </p>
                        </div>

                        {/* Listado de Habitaciones */}
                        {cargasHabitacion.length > 0 ? (
                            <div className="space-y-6">
                                {cargasHabitacion.map((carga) => (
                                    <div key={carga.habitacion} className="border border-gray-300 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                                            <span className="font-bold text-lg text-gray-900">Habitación {carga.habitacion}</span>
                                            <span className="font-bold text-lg text-gray-900">{formatCurrency(carga.total)}</span>
                                        </div>
                                        <div className="p-3 bg-white">
                                            <table className="w-full text-sm">
                                                <thead className="text-left text-gray-500 border-b border-gray-100">
                                                    <tr>
                                                        <th className="pb-2 font-medium">Consumo</th>
                                                        <th className="pb-2 text-right font-medium">Cant.</th>
                                                        <th className="pb-2 text-right font-medium">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {carga.consumos.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 text-gray-800">{item.consumoDescripcion}</td>
                                                            <td className="py-2 text-right text-gray-600">{item.cantidad}</td>
                                                            <td className="py-2 text-right text-gray-800 font-medium">{formatCurrency(item.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-between items-center py-4 border-t-2 border-gray-800 mt-4">
                                    <span className="text-xl font-bold text-gray-900">TOTAL A CARGAR:</span>
                                    <span className="font-bold text-3xl text-gray-900">{formatCurrency(totalGeneral)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 italic">
                                No hay cargos a habitación registrados para hoy en esta área.
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-3">
                            <p>Generado: {new Date().toLocaleString('es-AR')}</p>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleGenerarImagen}
                        disabled={enviando}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Regenerar
                    </Button>
                    <Button
                        onClick={handleEnviarWhatsApp}
                        disabled={enviando || cargasHabitacion.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {enviando ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Cargos
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
