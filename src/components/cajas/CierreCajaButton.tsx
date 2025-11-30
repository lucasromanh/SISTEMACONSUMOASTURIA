import { useState, useRef } from 'react';
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
import { Send, FileText, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useCajasStore } from '@/store/consumosStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getDateRangeByPeriod } from '@/utils/dateHelpers';
import type { AreaConsumo } from '@/types/consumos';

interface CierreCajaButtonProps {
  variant?: 'default' | 'outline';
  area?: AreaConsumo;
}

interface CargaHabitacion {
  habitacion: string;
  total: number;
}

export function CierreCajaButton({ variant = 'default', area }: CierreCajaButtonProps) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [imagenGenerada, setImagenGenerada] = useState<string | null>(null);
  const cierreRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { getMovimientosByDateRange } = useCajasStore();
  const { toast } = useToast();

  // Obtener movimientos del día
  const { start, end } = getDateRangeByPeriod('day');
  const movimientos = getMovimientosByDateRange(start, end, area);

  // Calcular resumen
  const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO');
  const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

  const totalEfectivo = ingresos
    .filter((m) => m.metodoPago === 'EFECTIVO' || m.origen === 'INICIAL')
    .reduce((sum, m) => sum + m.monto, 0);

  const totalTransferencia = ingresos
    .filter((m) => m.metodoPago === 'TRANSFERENCIA' && m.origen !== 'INICIAL')
    .reduce((sum, m) => sum + m.monto, 0);

  const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0);
  const totalNeto = totalEfectivo + totalTransferencia - totalEgresos;

  // Obtener cargas a habitación del día
  const cargasHabitacion: CargaHabitacion[] = [];
  movimientos.forEach((mov) => {
    if (mov.origen === 'CONSUMO' && mov.descripcion) {
      // Buscar patrón "Hab. NUMERO (Pendiente)"
      const matchHab = mov.descripcion.match(/Hab\.\s*(\d+)\s*\(Pendiente\)/);
      if (matchHab) {
        const habitacion = matchHab[1];
        const existente = cargasHabitacion.find(c => c.habitacion === habitacion);
        if (existente) {
          existente.total += mov.monto;
        } else {
          cargasHabitacion.push({ habitacion, total: mov.monto });
        }
      }
    }
  });

  const totalCargasHabitacion = cargasHabitacion.reduce((sum, c) => sum + c.total, 0);

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
        description: 'No se pudo generar la imagen del cierre',
      });
    }
  };

  // Enviar por WhatsApp
  const handleEnviarWhatsApp = async () => {
    if (!imagenGenerada) {
      await handleGenerarImagen();
      // Esperar un momento para que se genere la imagen
      setTimeout(() => {
        handleEnviarWhatsApp();
      }, 500);
      return;
    }

    setEnviando(true);

    try {
      const numeroWhatsApp = '5493868400835'; // +54 9 3868 40-0835
      const mensaje = encodeURIComponent(
        `*Cierre de Caja - ${areaLabel}*\n` +
        `📅 Fecha: ${formatDate(start)}\n` +
        `👤 Usuario: ${user?.displayName || 'Sistema'}\n\n` +
        `💵 *Efectivo:* ${formatCurrency(totalEfectivo)}\n` +
        `🏦 *Transferencia:* ${formatCurrency(totalTransferencia)}\n` +
        (totalEgresos > 0 ? `📤 *Egresos:* ${formatCurrency(totalEgresos)}\n` : '') +
        `💰 *TOTAL NETO:* ${formatCurrency(totalNeto)}\n` +
        (cargasHabitacion.length > 0 ? 
          `\n🏨 *Cargas a Habitación:* ${formatCurrency(totalCargasHabitacion)}\n` +
          cargasHabitacion.map(c => `  • Hab. ${c.habitacion}: ${formatCurrency(c.total)}`).join('\n')
          : ''
        )
      );

      // Convertir data URL a blob para crear archivo
      const response = await fetch(imagenGenerada);
      const blob = await response.blob();
      const file = new File([blob], `cierre-caja-${formatDate(start)}.png`, { type: 'image/png' });

      // Detectar si es móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // En móvil: intentar Web Share API (permite elegir WhatsApp directamente)
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Cierre de Caja',
              text: `Cierre de Caja - ${areaLabel}`,
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

      // En desktop o si falla Web Share API:
      // 1. Descargar la imagen
      const link = document.createElement('a');
      link.download = `cierre-caja-${formatDate(start)}.png`;
      link.href = imagenGenerada;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Abrir WhatsApp Web con el mensaje
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
        description: 'No se pudo procesar el cierre',
      });
    } finally {
      setEnviando(false);
    }
  };

  const areaLabel = area ? area.replace('_', ' ') : 'General';

  // Generar imagen automáticamente al abrir
  const handleOpenDialog = () => {
    setOpen(true);
    setImagenGenerada(null);
    // Generar imagen después de que el diálogo se renderice
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
          className="gap-2"
          onClick={handleOpenDialog}
        >
          <Send className="h-4 w-4" />
          Enviar Cierre de Caja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cierre de Caja - {areaLabel}
          </DialogTitle>
          <DialogDescription>
            Previsualización del cierre que se enviará por WhatsApp
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Contenido que se convertirá en imagen */}
          <div
            ref={cierreRef}
            className="bg-white p-8 rounded-lg space-y-6"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">Hotel Asturias</h1>
              <h2 className="text-xl font-semibold text-gray-700 mt-1">Cierre de Caja</h2>
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

            {/* Resumen de Ingresos */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-1">
                💰 Resumen de Ingresos
              </h3>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">💵 Efectivo:</span>
                <span className="font-bold text-green-700 text-lg">{formatCurrency(totalEfectivo)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">🏦 Transferencia:</span>
                <span className="font-bold text-blue-700 text-lg">{formatCurrency(totalTransferencia)}</span>
              </div>

              {totalEgresos > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-700">📤 Egresos:</span>
                  <span className="font-bold text-red-700 text-lg">-{formatCurrency(totalEgresos)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-t-2 border-gray-800 mt-2">
                <span className="text-lg font-bold text-gray-900">💰 TOTAL NETO:</span>
                <span className="font-bold text-2xl text-green-800">{formatCurrency(totalNeto)}</span>
              </div>
            </div>

            {/* Cargas a Habitación */}
            {cargasHabitacion.length > 0 && (
              <div className="space-y-3 border-t-2 border-gray-300 pt-4">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-1">
                  🏨 Cargas a Habitación (Pendientes de Cobro)
                </h3>
                
                <div className="space-y-2">
                  {cargasHabitacion.map((carga) => (
                    <div
                      key={carga.habitacion}
                      className="flex justify-between items-center py-2 bg-amber-50 px-3 rounded border border-amber-200"
                    >
                      <span className="font-semibold text-gray-800">
                        Habitación {carga.habitacion}
                      </span>
                      <span className="font-bold text-amber-800 text-lg">
                        {formatCurrency(carga.total)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-3 border-t-2 border-amber-600 mt-2 bg-amber-100 px-3 rounded">
                  <span className="text-lg font-bold text-gray-900">Total a Cobrar:</span>
                  <span className="font-bold text-2xl text-amber-800">
                    {formatCurrency(totalCargasHabitacion)}
                  </span>
                </div>
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
            Regenerar Vista Previa
          </Button>
          <Button
            onClick={handleEnviarWhatsApp}
            disabled={enviando}
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
                Enviar por WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
