import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StockAdjustForm } from './StockAdjustForm';
import { AlertTriangle } from 'lucide-react';
import type { StockItem } from '@/types/stock';

interface StockTableProps {
  items: StockItem[];
}

const getAreaBadgeClass = (area: string) => {
  switch (area) {
    case 'WINNE_BAR':
      return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'BARRA_PILETA':
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'FINCA':
      return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'RESTAURANTE':
      return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'GENERAL':
      return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700';
    default:
      return '';
  }
};

export function StockTable({ items }: StockTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay ítems de stock registrados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border h-[600px] flex flex-col">
      {/* Vista Desktop - Tabla */}
      <div className="hidden md:block flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Stock Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLowStock = item.stockActual < item.stockMinimo;
                return (
                  <TableRow key={item.id} className={isLowStock ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell>
                      <Badge variant="outline" className={getAreaBadgeClass(item.area)}>
                        {item.area.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right font-semibold">{item.stockActual}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.stockMinimo}</TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Bajo Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <StockAdjustForm item={item} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Vista Móvil - Tarjetas */}
      <div className="md:hidden flex-1 overflow-auto bg-gray-50/50 dark:bg-black/20 p-3">
        <div className="space-y-3">
          {items.map((item) => {
            const isLowStock = item.stockActual < item.stockMinimo;
            return (
              <div key={item.id} className={`p-4 border rounded-lg space-y-3 bg-card shadow-sm ${isLowStock ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      <p className="font-semibold text-lg">{item.nombre}</p>
                    </div>
                    <Badge variant="outline" className={getAreaBadgeClass(item.area)}>
                      {item.area.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end">
                    {isLowStock ? (
                      <Badge variant="destructive">Bajo Stock</Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-700">Stock OK</Badge>
                    )}
                    <Badge variant="secondary" className="mt-1 text-xs">{item.categoria}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stock Actual</p>
                    <p className={`font-semibold text-lg ${isLowStock ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                      {item.stockActual} {item.unidad}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mínimo Requerido</p>
                    <p className="font-medium">{item.stockMinimo} {item.unidad}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <StockAdjustForm item={item} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
