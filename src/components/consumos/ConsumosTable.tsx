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
  // ✅ Estado para modal de comprobante (transferencia o tarjeta)
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenComprobante, setImagenComprobante] = useState<string>('');
  const [tipoComprobante, setTipoComprobante] = useState<'TRANSFERENCIA' | 'TARJETA'>('TRANSFERENCIA');

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
        <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px] w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs lg:text-sm min-w-[100px]">Fecha</TableHead>
                <TableHead className="text-xs lg:text-sm min-w-[150px] max-w-[200px]">Habitación/Cliente</TableHead>
                <TableHead className="text-xs lg:text-sm min-w-[120px]">Consumo</TableHead>
                <TableHead className="hidden xl:table-cell text-xs lg:text-sm min-w-[100px]">Categoría</TableHead>
                <TableHead className="hidden lg:table-cell text-right text-xs lg:text-sm">Cantidad</TableHead>
                <TableHead className="hidden lg:table-cell text-right text-xs lg:text-sm">Precio Unit.</TableHead>
                <TableHead className="text-right text-xs lg:text-sm min-w-[90px]">Total</TableHead>
                <TableHead className="text-xs lg:text-sm min-w-[80px]">Estado</TableHead>
                <TableHead className="text-xs lg:text-sm min-w-[120px]">Método Pago</TableHead>
                <TableHead className="text-xs lg:text-sm min-w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumos.map((consumo) => (
                <TableRow key={consumo.id}>
                  <TableCell className="whitespace-nowrap text-xs lg:text-sm">{formatDate(consumo.fecha)}</TableCell>
                  <TableCell className="font-medium text-xs lg:text-sm max-w-[200px] truncate" title={consumo.habitacionOCliente}>{consumo.habitacionOCliente}</TableCell>
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
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{consumo.metodoPago}</Badge>
                        {/* ✅ Botón para ver comprobante de transferencia */}
                        {consumo.metodoPago === 'TRANSFERENCIA' && (consumo as any).datosTransferencia?.imagenComprobante && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setImagenComprobante((consumo as any).datosTransferencia.imagenComprobante);
                              setTipoComprobante('TRANSFERENCIA');
                              setComprobanteModalOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Ver comprobante de transferencia"
                          >
                            <FileImage className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        {/* ✅ NUEVO: Botón para ver comprobante de tarjeta */}
                        {consumo.metodoPago === 'TARJETA_CREDITO' && (consumo as any).datosTarjeta?.imagenComprobante && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              console.log('🖼️ CLICK TARJETA - Consumo completo:', consumo);
                              console.log('🖼️ CLICK TARJETA - datosTarjeta:', (consumo as any).datosTarjeta);
                              console.log('🖼️ CLICK TARJETA - imagenComprobante (primeros 100 chars):', (consumo as any).datosTarjeta.imagenComprobante?.substring(0, 100));
                              setImagenComprobante((consumo as any).datosTarjeta.imagenComprobante);
                              setTipoComprobante('TARJETA');
                              setComprobanteModalOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Ver comprobante de posnet"
                          >
                            <FileImage className="h-4 w-4 text-purple-600" />
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
                      {/* ✅ CORREGIDO: Solo mostrar botón de ticket si NO hay comprobante de tarjeta/transferencia */}
                      {consumo.ticketId &&
                        !(consumo.metodoPago === 'TARJETA_CREDITO' && (consumo as any).datosTarjeta?.imagenComprobante) &&
                        !(consumo.metodoPago === 'TRANSFERENCIA' && (consumo as any).datosTransferencia?.imagenComprobante) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTicketId(consumo.ticketId!);
                              setTicketModalOpen(true);
                            }}
                            className="text-[10px] px-2 h-7 whitespace-nowrap"
                            title="Ver ticket de facturación"
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
        <div className="space-y-3 w-full pb-20"> {/* pb-20 para dar espacio al scroll final */}
          {consumos.map((consumo) => (
            <div key={consumo.id} className="p-3 border rounded-lg space-y-2 bg-card w-full shadow-sm">
              <div className="flex justify-between items-start">
                <div className="min-w-0 max-w-[60%]">
                  <p className="font-semibold text-lg leading-tight truncate">{consumo.consumoDescripcion}</p>
                  <p className="text-sm text-muted-foreground truncate">{consumo.habitacionOCliente}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge estado={consumo.estado} />
                  {consumo.estado === 'CARGAR_HABITACION' && (
                    <Button
                      size="sm"
                      onClick={() => handlePagarConsumo(consumo)}
                      className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                    >
                      💰 Pagar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-2 rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(consumo.fecha)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoría</p>
                  <Badge variant="outline" className="mt-0.5 text-[10px] h-5 px-1.5">{consumo.categoria}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad</p>
                  <p className="font-medium">{consumo.cantidad}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio Unit.</p>
                  <p className="font-medium">{formatCurrency(consumo.precioUnitario)}</p>
                </div>
              </div>

              {/* ✅ CORREGIDO: Botón Ver Ticket - Solo si NO hay comprobante de tarjeta/transferencia */}
              {consumo.ticketId &&
                !(consumo.metodoPago === 'TARJETA_CREDITO' && (consumo as any).datosTarjeta?.imagenComprobante) &&
                !(consumo.metodoPago === 'TRANSFERENCIA' && (consumo as any).datosTransferencia?.imagenComprobante) && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTicketId(consumo.ticketId!);
                        setTicketModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 h-8 text-xs"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Ver Ticket de Facturación
                    </Button>
                  </div>
                )}

              <div className="pt-2 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Método de Pago</p>
                    {consumo.estado === 'CARGAR_HABITACION' ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        Cargar a Hab.
                      </Badge>
                    ) : consumo.metodoPago ? (
                      <Badge variant="secondary" className="font-medium">
                        {consumo.metodoPago}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-hotel-wine-700 dark:text-hotel-wine-400">
                      {formatCurrency(consumo.total)}
                    </p>
                  </div>
                </div>

                {/* ✅ Botón de Comprobante FULL WIDTH y separado */}
                {consumo.metodoPago === 'TRANSFERENCIA' && (
                  <div className="w-full">
                    {(consumo as any).datosTransferencia?.imagenComprobante ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setImagenComprobante((consumo as any).datosTransferencia.imagenComprobante);
                          setTipoComprobante('TRANSFERENCIA');
                          setComprobanteModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                      >
                        <FileImage className="h-4 w-4" />
                        Comprobante Transferencia
                      </Button>
                    ) : (
                      <div className="w-full py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-center text-xs text-muted-foreground italic">
                        (Sin comprobante adjunto)
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ Botón de Comprobante TARJETA DE CRÉDITO */}
                {consumo.metodoPago === 'TARJETA_CREDITO' && (
                  <div className="w-full">
                    {(consumo as any).datosTarjeta?.imagenComprobante ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          console.log('🖼️ MOBILE CLICK TARJETA - Consumo completo:', consumo);
                          console.log('🖼️ MOBILE CLICK TARJETA - datosTarjeta:', (consumo as any).datosTarjeta);
                          const img = (consumo as any).datosTarjeta.imagenComprobante;
                          console.log('🖼️ MOBILE CLICK TARJETA - imagen (primeros 100 chars):', img?.substring(0, 100));
                          setImagenComprobante(img);
                          setTipoComprobante('TARJETA');
                          setComprobanteModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60"
                      >
                        <FileImage className="h-4 w-4" />
                        Comprobante Posnet
                      </Button>
                    ) : (
                      <div className="w-full py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-center text-xs text-muted-foreground italic">
                        (Sin comprobante adjunto)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
                  <SelectItem value="TARJETA_CREDITO">💳 Tarjeta de Crédito/Débito</SelectItem>
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

      {/* ✅ Modal de Comprobante (Transferencia o Tarjeta) */}
      <Dialog open={comprobanteModalOpen} onOpenChange={setComprobanteModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="text-base font-semibold">
              {tipoComprobante === 'TRANSFERENCIA' ? 'Comprobante de Transferencia' : 'Comprobante de Posnet'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto flex-1">
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 overflow-auto">
              <img
                src={imagenComprobante}
                alt="Comprobante de pago"
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
