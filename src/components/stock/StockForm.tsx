import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStockStore } from '@/store/stockStore';
import type { AreaConsumo } from '@/types/consumos';
import { Plus } from 'lucide-react';

export function StockForm() {
  const { addItem } = useStockStore();
  const [open, setOpen] = useState(false);

  const [area, setArea] = useState<AreaConsumo | 'GENERAL'>('GENERAL');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidad, setUnidad] = useState('');
  const [stockActual, setStockActual] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addItem({
      area,
      nombre,
      categoria,
      unidad,
      stockActual: parseFloat(stockActual),
      stockMinimo: parseFloat(stockMinimo),
    });

    // Reset form
    setArea('GENERAL');
    setNombre('');
    setCategoria('');
    setUnidad('');
    setStockActual('');
    setStockMinimo('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Item al Stock</DialogTitle>
          <DialogDescription>
            Complete los datos del producto a agregar al inventario
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select value={area} onValueChange={(v) => setArea(v as typeof area)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="WINNE_BAR">Winne Bar</SelectItem>
                  <SelectItem value="BARRA_PILETA">Barra Pileta</SelectItem>
                  <SelectItem value="FINCA">La Finca</SelectItem>
                  <SelectItem value="RESTAURANTE">Restaurante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Producto</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Ej: Coca-Cola 500ml"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Café">Café</SelectItem>
                  <SelectItem value="Tragos">Tragos</SelectItem>
                  <SelectItem value="Gaseosas">Gaseosas</SelectItem>
                  <SelectItem value="Cervezas">Cervezas</SelectItem>
                  <SelectItem value="Licores">Licores</SelectItem>
                  <SelectItem value="Vinos">Vinos</SelectItem>
                  <SelectItem value="Whisky">Whisky</SelectItem>
                  <SelectItem value="Snacks">Snacks</SelectItem>
                  <SelectItem value="Smoothies">Smoothies</SelectItem>
                  <SelectItem value="Jugos">Jugos</SelectItem>
                  <SelectItem value="Bebidas Calientes">Bebidas Calientes</SelectItem>
                  <SelectItem value="Entradas">Entradas</SelectItem>
                  <SelectItem value="Platos Principales">Platos Principales</SelectItem>
                  <SelectItem value="Postres">Postres</SelectItem>
                  <SelectItem value="Carnes">Carnes</SelectItem>
                  <SelectItem value="Pescados">Pescados</SelectItem>
                  <SelectItem value="Vegetales">Vegetales</SelectItem>
                  <SelectItem value="Lácteos">Lácteos</SelectItem>
                  <SelectItem value="Panadería">Panadería</SelectItem>
                  <SelectItem value="Limpieza">Limpieza</SelectItem>
                  <SelectItem value="Desechables">Desechables</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad de Medida</Label>
              <Select value={unidad} onValueChange={setUnidad} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="botellas">Botellas</SelectItem>
                  <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                  <SelectItem value="litros">Litros</SelectItem>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="cajas">Cajas</SelectItem>
                  <SelectItem value="gramos">Gramos (g)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockActual">Stock Actual</Label>
              <Input
                id="stockActual"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock Mínimo</Label>
              <Input
                id="stockMinimo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
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
              Agregar al Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
