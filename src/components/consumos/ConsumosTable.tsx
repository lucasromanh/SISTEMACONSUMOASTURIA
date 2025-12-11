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
import { type MetodoPago } from '@/types/consumos';
import { TicketReceiptModal } from '@/components/tickets/TicketReceiptModal';
import { Receipt, FileImage } from 'lucide-react';

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
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  // ✅ Estado para modal de comprobante de transferencia
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenComprobante, setImagenComprobante] = useState<string>('');

  const handlePagarConsumo = (consumo: Consumo) => {
    setConsumoAPagar(consumo);
    setMetodoPago('EFECTIVO');
    setPagoModalOpen(true);
  };

  const confirmarPago = async () => {
    if (!consumoAPagar || !user) return;

    try {
      // Actualizar el consumo a PAGADO
      // NOTA: El backend (create_consumo_pago.php) ya se encarga de crear
      // el movimiento de caja automáticamente en syncPagoToAreaMovementsAndCaja
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
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo registrar el pago. Intenta nuevamente.",
        variant: "destructive",
      });
    }
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
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{consumo.metodoPago}</Badge>
                        {/* ✅ NUEVO: Botón para ver comprobante de transferencia */}
                        {consumo.metodoPago === 'TRANSFERENCIA' && (consumo as any).datosTransferencia?.imagenComprobante && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setImagenComprobante((consumo as any).datosTransferencia.imagenComprobante);
                              setComprobanteModalOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Ver comprobante"
                          >
                            <FileImage className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[140px] px-2">
                    <div className="flex gap-1">
                      {consumo.estado === 'CARGAR_HABITACION' && (
                        <Button
                          size="sm"
                          onClick={() => handlePagarConsumo(consumo)}
                          className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 h-7 whitespace-nowrap"
                        >
                          💰 Pagar
                        </Button>
                      )}
                      {consumo.ticketId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTicketId(consumo.ticketId!);
                            setTicketModalOpen(true);
                          }}
                          className="text-[10px] px-2 h-7 whitespace-nowrap"
                        >
                          <Receipt className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
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

                {/* Botón Ver Ticket - Solo si tiene ticketId */}
                {consumo.ticketId && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTicketId(consumo.ticketId!);
                        setTicketModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Receipt className="h-4 w-4" />
                      Ver Ticket de Facturación
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Método de Pago</p>
                    {consumo.estado === 'CARGAR_HABITACION' ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 mt-1">
                        Cargar a Hab.
                      </Badge>
                    ) : consumo.metodoPago ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{consumo.metodoPago}</Badge>
                        {/* ✅ Botón para ver comprobante de transferencia en móvil */}
                        {consumo.metodoPago === 'TRANSFERENCIA' && (consumo as any).datosTransferencia?.imagenComprobante && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setImagenComprobante((consumo as any).datosTransferencia.imagenComprobante);
                              setComprobanteModalOpen(true);
                            }}
                            className="h-7 w-7 p-0"
                            title="Ver comprobante"
                          >
                            <FileImage className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
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

      {/* Modal de Ticket */}
      <TicketReceiptModal
        open={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        ticketId={selectedTicketId}
      />

      {/* ✅ Modal de Comprobante de Transferencia */}
      <Dialog open={comprobanteModalOpen} onOpenChange={setComprobanteModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="text-base font-semibold">
              Comprobante de Transferencia
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 overflow-auto">
              <img
                src={imagenComprobante}
                alt="Comprobante de transferencia"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
          <div className="p-4 pt-3 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Descargar imagen
                const link = document.createElement('a');
                link.href = imagenComprobante;
                link.download = `comprobante-${Date.now()}.png`;
                link.click();
              }}
              className="gap-2"
            >
              <FileImage className="h-4 w-4" />
              Descargar
            </Button>
            <Button
              onClick={() => setComprobanteModalOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
