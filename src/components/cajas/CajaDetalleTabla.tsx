import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { MovimientoCaja } from '@/types/cajas';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface CajaDetalleTablaProps {
  movimientos: MovimientoCaja[];
}

export function CajaDetalleTabla({ movimientos }: CajaDetalleTablaProps) {
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenComprobante, setImagenComprobante] = useState<string>('');
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoCaja | null>(null);

  const handleVerComprobante = (mov: MovimientoCaja) => {
    if (mov.datosTransferencia?.imagenComprobante) {
      setImagenComprobante(mov.datosTransferencia.imagenComprobante);
      setMovimientoSeleccionado(mov);
      setComprobanteModalOpen(true);
    }
  };

  if (movimientos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay movimientos registrados para mostrar.</p>
      </div>
    );
  }

  const getAreaBadgeClass = (area: string) => {
    switch (area) {
      case 'WINNE_BAR':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'BARRA_PILETA':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'FINCA':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'RESTAURANTE':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  return (
    <>
      {/* Vista Desktop */}
      <div className="hidden md:block">
        <ScrollArea className="h-[600px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Método Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(mov.fecha)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getAreaBadgeClass(mov.area)}>
                      {mov.area.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        mov.tipo === 'INGRESO'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                      }
                    >
                      {mov.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mov.origen}</Badge>
                  </TableCell>
                  <TableCell>{mov.descripcion}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={mov.tipo === 'INGRESO' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}
                      {formatCurrency(mov.monto)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {mov.metodoPago ? (
                        <Badge variant="outline">{mov.metodoPago}</Badge>
                      ) : mov.origen === 'CONSUMO' && mov.descripcion.includes('(Pendiente)') ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                          Cargar a Habitación
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                      {mov.metodoPago === 'TRANSFERENCIA' && mov.datosTransferencia?.imagenComprobante && (
                        <button
                          onClick={() => handleVerComprobante(mov)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          📄 Ver
                        </button>
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
            {movimientos.map((mov) => (
              <div key={mov.id} className="p-3 border rounded-lg space-y-3 bg-card w-full">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge variant="outline" className={getAreaBadgeClass(mov.area)}>
                      {mov.area.replace('_', ' ')}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{formatDate(mov.fecha)}</p>
                  </div>
                  <Badge
                    className={
                      mov.tipo === 'INGRESO'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }
                  >
                    {mov.tipo}
                  </Badge>
                </div>

                <div>
                  <p className="font-medium">{mov.descripcion}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">{mov.origen}</Badge>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Método de Pago</p>
                    <div className="flex items-center gap-2 mt-1">
                      {mov.metodoPago ? (
                        <Badge variant="outline">{mov.metodoPago}</Badge>
                      ) : mov.origen === 'CONSUMO' && mov.descripcion.includes('(Pendiente)') ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                          Cargar a Hab.
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                      {mov.metodoPago === 'TRANSFERENCIA' && mov.datosTransferencia?.imagenComprobante && (
                        <button
                          onClick={() => handleVerComprobante(mov)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          📄 Ver comprobante
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Monto</p>
                    <p className={`text-2xl font-bold ${mov.tipo === 'INGRESO' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}
                      {formatCurrency(mov.monto)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Modal de Comprobante */}
      <Dialog open={comprobanteModalOpen} onOpenChange={setComprobanteModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                📄 Comprobante de Transferencia
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setComprobanteModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {movimientoSeleccionado && (
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p><strong>Monto:</strong> {formatCurrency(movimientoSeleccionado.monto)}</p>
                <p><strong>Fecha:</strong> {formatDate(movimientoSeleccionado.fecha)}</p>
                {movimientoSeleccionado.datosTransferencia?.numeroOperacion && (
                  <p><strong>N° Operación:</strong> {movimientoSeleccionado.datosTransferencia.numeroOperacion}</p>
                )}
                {movimientoSeleccionado.datosTransferencia?.banco && (
                  <p><strong>Banco:</strong> {movimientoSeleccionado.datosTransferencia.banco}</p>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-[60vh]">
              <img
                src={imagenComprobante}
                alt="Comprobante de transferencia"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
