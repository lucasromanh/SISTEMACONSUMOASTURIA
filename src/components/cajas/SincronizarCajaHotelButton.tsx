import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import type { MovimientoCaja, DatosParaCajaHotel } from '@/types/cajas';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface SincronizarCajaHotelButtonProps {
  movimientos: MovimientoCaja[];
}

export function SincronizarCajaHotelButton({ movimientos }: SincronizarCajaHotelButtonProps) {
  const [open, setOpen] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Convertir movimientos a formato para Caja del Hotel
  const datosParaSincronizar: DatosParaCajaHotel[] = movimientos
    .filter(m => m.tipo === 'INGRESO' && !m.sincronizado) // Solo ingresos no sincronizados
    .map(mov => {
      // Determinar número de factura y razón social
      let numeroFactura = mov.numeroFactura || '-';
      let razonSocial = mov.razonSocial || '-';

      // Si viene de consumo, intentar extraer de la descripción
      if (mov.origen === 'CONSUMO' && mov.descripcion) {
        // Formatos posibles:
        // "Producto - 142" (pagado)
        // "Producto - Hab. 142 (Pendiente)" (cargar a habitación)
        // "Producto - Juan Pérez" (cliente)

        let habitacionOCliente = '';

        // Buscar patrón "Hab. NUMERO (Pendiente)"
        const matchHabPendiente = mov.descripcion.match(/- Hab\.\s*(\d+)\s*\(Pendiente\)/);
        if (matchHabPendiente) {
          habitacionOCliente = matchHabPendiente[1];
        } else {
          // Buscar patrón general "- ALGO"
          const matchGeneral = mov.descripcion.match(/- (.+?)$/);
          if (matchGeneral) {
            habitacionOCliente = matchGeneral[1].trim();
          }
        }

        if (habitacionOCliente) {
          // Si es número, es habitación
          if (/^\d+$/.test(habitacionOCliente)) {
            numeroFactura = `HAB ${habitacionOCliente}`;
            razonSocial = '-';
          } else {
            // Si no, es nombre de cliente
            numeroFactura = '-';
            razonSocial = habitacionOCliente;
          }
        }
      }

      // Obtener turno del usuario
      const turno = mov.turno || user?.displayName || 'Sistema';

      // Determinar área en español
      const areaMap: Record<string, string> = {
        'WINNE_BAR': 'Winne Bar',
        'BARRA_PILETA': 'Barra Pileta',
        'FINCA': 'La Finca',
        'RESTAURANTE': 'Restaurante',
      };
      const areaTexto = areaMap[mov.area] || mov.area;

      // Determinar método de pago
      const pagoTexto = mov.metodoPago || 'Cargar a Habitación';

      return {
        fecha: mov.fecha,
        ingreso: mov.monto,
        turno,
        numeroFactura,
        razonSocial,
        area: areaTexto,
        pago: pagoTexto,
        total: mov.monto,
      };
    });

  const handleSincronizar = async () => {
    setSincronizando(true);

    try {
      if (!user?.id) {
        throw new Error('Usuario no identificado');
      }

      // Llamar al endpoint de sincronización (usar ruta relativa para producción)
      const response = await fetch('/process_integration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          // No enviamos área específica para sincronizar TODAS las áreas
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error en la sincronización');
      }

      toast({
        title: '✅ Sincronización exitosa',
        description: `${result.synced} de ${result.total} movimientos sincronizados con Caja del Hotel`,
      });

      // Mostrar errores si los hay
      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Errores en sincronización:', result.errors);
        toast({
          variant: 'default',
          title: '⚠️ Sincronización parcial',
          description: `${result.errors.length} movimientos no se sincronizaron. Revisa la consola para más detalles.`,
        });
      }

      setOpen(false);

      // Recargar movimientos para actualizar la vista
      window.location.reload();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '❌ Error en sincronización',
        description: error instanceof Error ? error.message : 'No se pudo conectar con el sistema de Caja del Hotel',
      });
    } finally {
      setSincronizando(false);
    }
  };

  const totalASincronizar = datosParaSincronizar.reduce((sum, d) => sum + d.ingreso, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Sincronizar con Caja del Hotel
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[95vw] sm:!max-w-2xl md:!max-w-4xl lg:!max-w-5xl max-h-[85vh] sm:max-h-[90vh] p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="h-5 w-5 text-blue-600" />
            Sincronizar con Caja del Hotel
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Los siguientes datos serán enviados al sistema de Caja del Hotel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-4">
          {/* Resumen */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 sm:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-sm text-muted-foreground">Movimientos a sincronizar</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
                {datosParaSincronizar.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total ingresos</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(totalASincronizar)}
              </p>
            </div>
          </div>

          {/* Tabla de datos */}
          <ScrollArea className="h-[300px] sm:h-[350px] md:h-[400px] rounded-md border">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] sm:text-xs">Fecha</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs">Ingreso</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] sm:text-xs">Turno</TableHead>
                  <TableHead className="hidden lg:table-cell text-[10px] sm:text-xs">N° Factura</TableHead>
                  <TableHead className="hidden lg:table-cell text-[10px] sm:text-xs">Razón Social</TableHead>
                  <TableHead className="text-[10px] sm:text-xs">Área</TableHead>
                  <TableHead className="hidden sm:table-cell text-[10px] sm:text-xs">Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datosParaSincronizar.map((dato, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap text-[10px] sm:text-xs">{formatDate(dato.fecha)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700 dark:text-green-400 text-[10px] sm:text-xs">
                      {formatCurrency(dato.ingreso)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[10px] sm:text-xs">{dato.turno}</TableCell>
                    <TableCell className="hidden lg:table-cell text-[10px] sm:text-xs">
                      {dato.numeroFactura !== '-' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] sm:text-xs">
                          {dato.numeroFactura}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-[10px] sm:text-xs">
                      {dato.razonSocial !== '-' ? dato.razonSocial : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] sm:text-xs">
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">{dato.area}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-[10px] sm:text-xs">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">{dato.pago}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Advertencia */}
          {datosParaSincronizar.length === 0 && (
            <div className="flex items-center gap-2 p-2 sm:p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-400">
                No hay movimientos de ingreso para sincronizar en el período seleccionado
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sincronizando} className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
            Cancelar
          </Button>
          <Button
            onClick={handleSincronizar}
            disabled={sincronizando || datosParaSincronizar.length === 0}
            className="gap-2 w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
          >
            {sincronizando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sincronizando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmar Sincronización
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
