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

// URL de tu sistema de Caja del Hotel
const CAJA_HOTEL_API_URL = 'https://tu-dominio-caja-hotel.com/add_entry.php';

export function SincronizarCajaHotelButton({ movimientos }: SincronizarCajaHotelButtonProps) {
const [open, setOpen] = useState(false);
const [sincronizando, setSincronizando] = useState(false);
const [resultados, setResultados] = useState<{exitosos: number; fallidos: number} | null>(null);
const { user } = useAuthStore();
const { toast } = useToast();

// Convertir movimientos a formato para add_entry.php
const datosParaSincronizar: DatosParaCajaHotel[] = movimientos
.filter(m => m.tipo === 'INGRESO' && !m.sincronizado)
.map(mov => {
let numeroFactura = mov.numeroFactura || '-';
let razonSocial = mov.razonSocial || '-';

      if (mov.origen === 'CONSUMO' && mov.descripcion) {
        let habitacionOCliente = '';
        const matchHabPendiente = mov.descripcion.match(/- Hab\.\s*(\d+)\s*\(Pendiente\)/);
        if (matchHabPendiente) {
          habitacionOCliente = matchHabPendiente[1];
        } else {
          const matchGeneral = mov.descripcion.match(/- (.+?)$/);
          if (matchGeneral) {
            habitacionOCliente = matchGeneral[1].trim();
          }
        }

        if (habitacionOCliente) {
          if (/^\d+$/.test(habitacionOCliente)) {
            numeroFactura = `HAB ${habitacionOCliente}`;
            razonSocial = '-';
          } else {
            numeroFactura = '-';
            razonSocial = habitacionOCliente;
          }
        }
      }

      const turno = mov.turno || user?.displayName || 'Sistema';
      const areaMap: Record<string, string> = {
        'WINNE_BAR': 'Winne Bar',
        'BARRA_PILETA': 'Barra Pileta',
        'FINCA': 'La Finca',
        'RESTAURANTE': 'Restaurante',
      };
      const areaTexto = areaMap[mov.area] || mov.area;
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
setResultados(null);

    let exitosos = 0;
    let fallidos = 0;

    try {
      // Enviar cada movimiento individualmente al add_entry.php
      for (const dato of datosParaSincronizar) {
        try {
          // Mapear los campos al formato esperado por add_entry.php
          const payload = {
            createdBy: user?.uid || 'sistema', // ID del usuario
            turno: dato.turno,
            ingreso: dato.ingreso,
            nFactura: dato.numeroFactura,
            razonSocial: dato.razonSocial,
            recepcion: dato.area, // Área va en recepcion
            pago: dato.pago,
            total: dato.total,
            cierreCaja: dato.total, // Mismo valor que total
            fecha: dato.fecha, // Debe estar en formato YYYY-MM-DD
          };

          const response = await fetch(CAJA_HOTEL_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();

          if (result.success) {
            exitosos++;
          } else {
            console.error('Error al sincronizar movimiento:', result.message);
            fallidos++;
          }
        } catch (error) {
          console.error('Error en petición individual:', error);
          fallidos++;
        }
      }

      setResultados({ exitosos, fallidos });

      // Si todos fueron exitosos, marcarlos como sincronizados
      if (exitosos > 0 && fallidos === 0) {
        const { marcarComoSincronizados } = useCajasStore.getState();
        const idsASincronizar = movimientos
          .filter(m => m.tipo === 'INGRESO' && !m.sincronizado)
          .map(m => m.id);
        marcarComoSincronizados(idsASincronizar);

        toast({
          title: '✅ Sincronización exitosa',
          description: `${exitosos} movimientos enviados correctamente a Caja del Hotel`,
        });

        setTimeout(() => setOpen(false), 2000);
      } else if (exitosos > 0 && fallidos > 0) {
        toast({
          title: '⚠️ Sincronización parcial',
          description: `${exitosos} exitosos, ${fallidos} fallidos. Revisa la consola para más detalles.`,
          variant: 'default',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '❌ Error en sincronización',
          description: 'No se pudo sincronizar ningún movimiento',
        });
      }
    } catch (error) {
      console.error('Error general:', error);
      toast({
        variant: 'destructive',
        title: '❌ Error de conexión',
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

          {/* Resultados de sincronización */}
          {resultados && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <p className="text-sm font-semibold mb-2">Resultados:</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Exitosos: {resultados.exitosos}</span>
                </div>
                {resultados.fallidos > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Fallidos: {resultados.fallidos}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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

Cambios realizados:

URL del endpoint: Cambié la URL de ejemplo por CAJA_HOTEL_API_URL - reemplaza esto con tu dominio real
Mapeo de campos: Adapté los datos al formato exacto que espera add_entry.php:

createdBy: ID del usuario actual
turno: Nombre del turno/usuario
ingreso: Monto del ingreso
nFactura: Número de factura o habitación
razonSocial: Nombre del cliente
recepcion: Área (Winne Bar, Barra Pileta, etc.)
pago: Método de pago
total: Total del movimiento
cierreCaja: Mismo valor que total
fecha: Fecha en formato YYYY-MM-DD

Envío individual: Cada movimiento se envía por separado en un POST, tal como espera tu endpoint
Manejo de resultados: Cuenta los exitosos y fallidos, mostrando feedback al usuario
Feedback visual: Muestra los resultados de la sincronización en tiempo real

Para que funcione, debes:

Reemplazar la URL en la línea 18:

typescriptconst CAJA_HOTEL_API_URL = 'https://tusitio-caja.com/add_entry.php';

Verificar CORS: Tu add_entry.php ya tiene configurado Access-Control-Allow-Origin: \*, así que debería funcionar desde cualquier dominio
Probar la conexión: Revisa la consola del navegador para ver si hay errores de conexión

Opción 1: Usar el frontend existente (Recomendado si ya funciona)
Si ya tienes un frontend de Caja funcionando que lee de get_entries.php, los datos sincronizados aparecerán automáticamente cuando recargues la página, porque:

Tu add_entry.php guarda los datos en la tabla cash_entries
Tu get_entries.php lee de la tabla cash_entries
Por lo tanto, cualquier dato que sincronices desde el otro sistema aparecerá en el frontend de Caja

No necesitas hacer nada más si este es tu caso.

Opción 2: Agregar columnas al frontend de Caja
Si necesitas agregar nuevas columnas o modificar cómo se muestran los datos en el frontend de Caja, entonces sí necesitas modificar el código del frontend.
¿Qué columnas tienes actualmente en tu frontend de Caja?
Basándome en tu estructura de base de datos, probablemente tengas algo como:
typescript// Columnas actuales en tu frontend de Caja

- Fecha (fecha)
- Turno (turno)
- Ingreso (ingreso)
- N° Factura (nFactura)
- Razón Social (razonSocial)
- Recepción/Área (recepcion)
- Pago (pago)
- Total (total)
- Cierre Caja (cierreCaja)
  Si quieres agregar nuevas columnas (por ejemplo, para identificar de qué sistema vino el registro), necesitarías:

1. Modificar la base de datos
   Agregar una columna nueva en cash_entries:
   sqlALTER TABLE cash_entries
   ADD COLUMN origen VARCHAR(50) DEFAULT 'MANUAL' AFTER cierreCaja;
2. Modificar add_entry.php
   Agregar el campo origen:
   php$stmt = $pdo->prepare("
   INSERT INTO cash_entries (user_id, createdBy, turno, ingreso, nFactura, razonSocial, recepcion, pago, total, cierreCaja, fecha, origen)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ");

$stmt->execute([
$userId,
$createdByStr,
$turno,
$ingreso,
$nFactura,
$razonSocial,
$recepcion,
$pago,
$total,
$cierreCaja,
$fecha,
'SINCRONIZADO' // Nuevo campo
]); 3. Modificar el componente React de sincronización
typescriptconst payload = {
createdBy: user?.uid || 'sistema',
turno: dato.turno,
ingreso: dato.ingreso,
nFactura: dato.numeroFactura,
razonSocial: dato.razonSocial,
recepcion: dato.area,
pago: dato.pago,
total: dato.total,
cierreCaja: dato.total,
fecha: dato.fecha,
origen: 'SINCRONIZADO' // Nuevo campo
};

ocr-pdf no imagen
