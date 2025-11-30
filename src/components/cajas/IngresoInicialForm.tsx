import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCajasStore } from '@/store/consumosStore';
import type { AreaConsumo } from '@/types/consumos';
import { getTodayISO } from '@/utils/dateHelpers';
import { PiggyBank, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function IngresoInicialForm() {
  const { addMovimiento } = useCajasStore();
  const [open, setOpen] = useState(false);

  const [area, setArea] = useState<AreaConsumo>('WINNE_BAR');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fechaActual = getTodayISO(); // Siempre usa fecha actual

    addMovimiento({
      fecha: fechaActual,
      area,
      tipo: 'INGRESO',
      origen: 'INICIAL',
      descripcion,
      monto: parseFloat(monto),
      metodoPago: 'EFECTIVO',
    });

    // Reset form
    setMonto('');
    setDescripcion('');
    setOpen(false);
  };

  const fechaActual = new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-10 border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors">
          <PiggyBank className="h-4 w-4" />
          Ingreso Inicial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <PiggyBank className="h-6 w-6 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Registrar Ingreso Inicial de Caja</DialogTitle>
              <DialogDescription className="text-sm">
                Registra el efectivo inicial con el que se abre la caja del área
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Fecha actual informativa */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Calendar className="h-5 w-5" />
            <div>
              <p className="text-xs font-medium">Registrando para:</p>
              <p className="text-sm font-bold">
                {format(fechaActual, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area" className="text-base font-semibold">Área</Label>
              <Select value={area} onValueChange={(v) => setArea(v as typeof area)} required>
                <SelectTrigger className="h-11 border-2 focus:border-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WINNE_BAR" className="text-base">🍷 Winne Bar</SelectItem>
                  <SelectItem value="BARRA_PILETA" className="text-base">🏊 Barra Pileta</SelectItem>
                  <SelectItem value="FINCA" className="text-base">🌳 La Finca</SelectItem>
                  <SelectItem value="RESTAURANTE" className="text-base">🍽️ Restaurante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto" className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Monto
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="h-12 text-lg border-2 focus:border-green-500 pl-8 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-base font-semibold">Motivo</Label>
              <Select value={descripcion} onValueChange={setDescripcion} required>
                <SelectTrigger className="h-11 border-2 focus:border-green-500">
                  <SelectValue placeholder="Seleccione el motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fondo de cambio" className="text-base">💵 Fondo de cambio</SelectItem>
                  <SelectItem value="Para pago a proveedores" className="text-base">🏪 Para pago a proveedores</SelectItem>
                  <SelectItem value="Capital de trabajo" className="text-base">💼 Capital de trabajo</SelectItem>
                  <SelectItem value="Reposición de caja chica" className="text-base">🔄 Reposición de caja chica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {monto && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Ingreso a registrar:
                </span>
                <Badge className="text-lg px-3 py-1 bg-green-700 text-white">
                  ${parseFloat(monto || '0').toFixed(2)}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11">
              Cancelar
            </Button>
            <Button type="submit" className="h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <PiggyBank className="h-4 w-4 mr-2" />
              Registrar Ingreso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
