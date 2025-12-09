import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import type { Consumo } from '@/types/consumos';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useConsumosStore } from '@/store/consumosStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import type { MetodoPago } from '@/types/consumos';

interface ConsumosTableProps {
  consumos: Consumo[];
}

export function ConsumosTable({ consumos }: ConsumosTableProps) {
  const { updateConsumo } = useConsumosStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [consumoAPagar, setConsumoAPagar] = useState<Consumo | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');

  const handlePagarConsumo = (consumo: Consumo) => {
    setConsumoAPagar(consumo);
    setMetodoPago('EFECTIVO');
    setPagoModalOpen(true);
  };

  const confirmarPago = () => {
    if (!consumoAPagar || !user) return;

    updateConsumo(consumoAPagar.id, {
      estado: 'PAGADO',
      montoPagado: consumoAPagar.total,
      metodoPago,
      usuarioRegistroId: user.id.toString(),
    });

    toast({
      title: "✅ Pago registrado",
      description: `Se registró el pago de ${formatCurrency(consumoAPagar.total)} para ${consumoAPagar.consumoDescripcion}`,
    });

    setPagoModalOpen(false);
    setConsumoAPagar(null);
  };

  return (
    <>
      {/* Vista Desktop */}
      <div className="hidden md:block w-full">
        <ScrollArea className="h-[600px] w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs lg:text-sm">Fecha</TableHead>
                <TableHead className="text-xs lg:text-sm">Habitación/Cliente</TableHead>
                <TableHead className="text-xs lg:text-sm">Consumo</TableHead>
                <TableHead className="hidden xl:table-cell text-xs lg:text-sm">Categoría</TableHead>
                <TableHead className="hidden lg:table-cell text-right text-xs lg:text-sm">Cantidad</TableHead>
                <TableHead className="hidden lg:table-cell text-right text-xs lg:text-sm">Precio Unit.</TableHead>
                <TableHead className="text-right text-xs lg:text-sm">Total</TableHead>
                <TableHead className="text-xs lg:text-sm">Estado</TableHead>
                <TableHead className="text-xs lg:text-sm">Método Pago</TableHead>
                <TableHead className="text-xs lg:text-sm">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumos.map((consumo) => (
                <TableRow key={consumo.id}>
                  <TableCell className="whitespace-nowrap text-xs lg:text-sm">{formatDate(consumo.fecha)}</TableCell>
                  <TableCell className="font-medium text-xs lg:text-sm">{consumo.habitacionOCliente}</TableCell>
                  <TableCell className="text-xs lg:text-sm">{consumo.consumoDescripcion}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge variant="outline" className="text-xs">{consumo.categoria}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-xs lg:text-sm">{consumo.cantidad}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-xs lg:text-sm">{formatCurrency(consumo.precioUnitario)}</TableCell>
                  <TableCell className="text-right font-semibold text-xs lg:text-sm">{formatCurrency(consumo.total)}</TableCell>
                  <TableCell>
                    <StatusBadge estado={consumo.estado} />
                  </TableCell>
                  <TableCell>
                    {consumo.estado === 'CARGAR_HABITACION' ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs whitespace-nowrap">
                        Habitación
                      </Badge>
                    ) : consumo.metodoPago ? (
                      <Badge variant="secondary" className="text-xs">{consumo.metodoPago}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px] px-2">
                    {consumo.estado === 'CARGAR_HABITACION' && (
                      <Button
                        size="sm"
                        onClick={() => handlePagarConsumo(consumo)}
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 h-7 whitespace-nowrap"
                      >
                        💰 Pagar
                      </Button>
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
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge estado={consumo.estado} />
                    {consumo.estado === 'CARGAR_HABITACION' && (
                      <Button
                        size="sm"
                        onClick={() => handlePagarConsumo(consumo)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        💰 Pagar
                      </Button>
                    )}
                  </div>
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

      {/* Modal de Pago */}
      <Dialog open={pagoModalOpen} onOpenChange={setPagoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {consumoAPagar ? (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="font-semibold">{consumoAPagar.consumoDescripcion}</p>
                <p className="text-sm text-muted-foreground">{consumoAPagar.habitacionOCliente}</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-2">
                  Total: {formatCurrency(consumoAPagar.total)}
                </p>
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium mb-2">Método de Pago</label>
              <Select value={metodoPago || 'EFECTIVO'} onValueChange={(value) => setMetodoPago(value as MetodoPago)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                  <SelectItem value="TARJETA">💳 Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarPago} className="bg-green-600 hover:bg-green-700">
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
