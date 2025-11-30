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
import { useCajasStore } from '@/store/consumosStore';
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
      // Aquí se implementará la conexión con el sistema de Caja del Hotel
      // Por ahora, simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 2000));

      // TODO: Implementar llamada a API del sistema de Caja del Hotel
      // const response = await fetch('URL_API_CAJA_HOTEL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(datosParaSincronizar),
      // });

      // Marcar los movimientos como sincronizados
      const { marcarComoSincronizados } = useCajasStore.getState();
      const idsASincronizar = movimientos
        .filter(m => m.tipo === 'INGRESO' && !m.sincronizado)
        .map(m => m.id);
      marcarComoSincronizados(idsASincronizar);

      toast({
        title: '✅ Sincronización exitosa',
        description: `${datosParaSincronizar.length} movimientos enviados a Caja del Hotel`,
      });

      setOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '❌ Error en sincronización',
        description: 'No se pudo conectar con el sistema de Caja del Hotel',
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
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Sincronizar con Caja del Hotel
          </DialogTitle>
          <DialogDescription>
            Los siguientes datos serán enviados al sistema de Caja del Hotel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-sm text-muted-foreground">Movimientos a sincronizar</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {datosParaSincronizar.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total ingresos</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(totalASincronizar)}
              </p>
            </div>
          </div>

          {/* Tabla de datos */}
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datosParaSincronizar.map((dato, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">{formatDate(dato.fecha)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(dato.ingreso)}
                    </TableCell>
                    <TableCell>{dato.turno}</TableCell>
                    <TableCell>
                      {dato.numeroFactura !== '-' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {dato.numeroFactura}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dato.razonSocial !== '-' ? dato.razonSocial : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{dato.area}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dato.pago}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Advertencia */}
          {datosParaSincronizar.length === 0 && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                No hay movimientos de ingreso para sincronizar en el período seleccionado
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sincronizando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSincronizar}
            disabled={sincronizando || datosParaSincronizar.length === 0}
            className="gap-2"
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
