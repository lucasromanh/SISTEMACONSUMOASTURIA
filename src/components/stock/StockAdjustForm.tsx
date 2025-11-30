import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStockStore } from '@/store/stockStore';
import type { StockItem } from '@/types/stock';
import { PackagePlus } from 'lucide-react';

interface StockAdjustFormProps {
  item: StockItem;
}

export function StockAdjustForm({ item }: StockAdjustFormProps) {
  const { updateItem } = useStockStore();
  const [open, setOpen] = useState(false);

  const [stockActual, setStockActual] = useState(item.stockActual.toString());
  const [stockMinimo, setStockMinimo] = useState(item.stockMinimo.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateItem(item.id, {
      stockActual: parseFloat(stockActual),
      stockMinimo: parseFloat(stockMinimo),
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-hotel-wine-50">
          <PackagePlus className="h-4 w-4 mr-1" />
          Ajustar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Stock: {item.nombre}</DialogTitle>
          <DialogDescription>
            Modifique las cantidades de stock para este producto
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {item.area.replace('_', ' ')} • {item.categoria}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockActual">Stock Actual ({item.unidad})</Label>
              <Input
                id="stockActual"
                type="number"
                step="0.01"
                min="0"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock Mínimo ({item.unidad})</Label>
              <Input
                id="stockMinimo"
                type="number"
                step="0.01"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
