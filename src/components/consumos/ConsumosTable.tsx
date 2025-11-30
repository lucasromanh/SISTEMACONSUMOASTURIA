import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import type { Consumo } from '@/types/consumos';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConsumosTableProps {
  consumos: Consumo[];
}

export function ConsumosTable({ consumos }: ConsumosTableProps) {
  if (consumos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay consumos registrados para mostrar.</p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Desktop */}
      <div className="hidden md:block">
        <ScrollArea className="h-[600px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Habitación/Cliente</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Método Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumos.map((consumo) => (
                <TableRow key={consumo.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(consumo.fecha)}</TableCell>
                  <TableCell className="font-medium">{consumo.habitacionOCliente}</TableCell>
                  <TableCell>{consumo.consumoDescripcion}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{consumo.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{consumo.cantidad}</TableCell>
                  <TableCell className="text-right">{formatCurrency(consumo.precioUnitario)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(consumo.total)}</TableCell>
                  <TableCell>
                    <StatusBadge estado={consumo.estado} />
                  </TableCell>
                  <TableCell>
                    {consumo.estado === 'CARGAR_HABITACION' ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        Cargar a Habitación
                      </Badge>
                    ) : consumo.metodoPago ? (
                      <Badge variant="secondary">{consumo.metodoPago}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Vista Móvil */}
      <div className="md:hidden">
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 w-full">
            {consumos.map((consumo) => (
              <div key={consumo.id} className="p-3 border rounded-lg space-y-2 bg-card w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{consumo.consumoDescripcion}</p>
                    <p className="text-sm text-muted-foreground">{consumo.habitacionOCliente}</p>
                  </div>
                  <StatusBadge estado={consumo.estado} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">{formatDate(consumo.fecha)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categoría</p>
                    <Badge variant="outline" className="mt-1">{consumo.categoria}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{consumo.cantidad}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio Unit.</p>
                    <p className="font-medium">{formatCurrency(consumo.precioUnitario)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Método de Pago</p>
                    {consumo.estado === 'CARGAR_HABITACION' ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 mt-1">
                        Cargar a Hab.
                      </Badge>
                    ) : consumo.metodoPago ? (
                      <Badge variant="secondary" className="mt-1">{consumo.metodoPago}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-hotel-wine-700 dark:text-hotel-wine-400">{formatCurrency(consumo.total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
