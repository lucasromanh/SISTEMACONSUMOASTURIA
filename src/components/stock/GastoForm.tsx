import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStockStore } from '@/store/stockStore';
import type { AreaConsumo } from '@/types/consumos';
import { getTodayISO } from '@/utils/dateHelpers';
import { Receipt, Calendar, DollarSign, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GastoFormProps {
  userArea?: AreaConsumo | 'GENERAL';
}

export function GastoForm({ userArea }: GastoFormProps) {
  const { addGasto } = useStockStore();

  const [area, setArea] = useState<AreaConsumo | 'GENERAL'>(userArea || 'GENERAL');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fechaActual = getTodayISO(); // Siempre usa fecha actual

    addGasto({
      fecha: fechaActual,
      area,
      descripcion,
      monto: parseFloat(monto),
    });

    // Reset form
    setDescripcion('');
    setMonto('');
  };

  const fechaActual = new Date();

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="border-b bg-gradient-to-r from-red-500 to-red-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Registrar Gasto
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1 bg-white/20 text-white border-white/30">
            <Calendar className="h-3 w-3" />
            {format(fechaActual, "d 'de' MMM", { locale: es })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fecha actual informativa */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Registrando para:</p>
                <p className="text-lg font-bold">
                  {format(fechaActual, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area" className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-red-600" />
                Área
              </Label>
              {userArea ? (
                <Input
                  id="area"
                  type="text"
                  value={area.replace('_', ' ')}
                  disabled
                  className="h-12 text-base border-2 bg-muted font-semibold"
                />
              ) : (
                <Select value={area} onValueChange={(v) => setArea(v as typeof area)} required>
                  <SelectTrigger className="h-12 text-base border-2 focus:border-red-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL" className="text-base">🏨 General</SelectItem>
                    <SelectItem value="WINNE_BAR" className="text-base">🍷 Winne Bar</SelectItem>
                    <SelectItem value="BARRA_PILETA" className="text-base">🏊 Barra Pileta</SelectItem>
                    <SelectItem value="FINCA" className="text-base">🌳 La Finca</SelectItem>
                    <SelectItem value="RESTAURANTE" className="text-base">🍽️ Restaurante</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto" className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                Monto
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="h-12 text-base border-2 focus:border-red-500 pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion" className="text-base font-semibold">
                Descripción del Gasto
              </Label>
              <Input
                id="descripcion"
                type="text"
                placeholder="Ej: Reposición de gaseosas, pago a proveedor..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="h-12 text-base border-2 focus:border-red-500"
                required
              />
            </div>
          </div>

          {/* Total calculado */}
          {monto && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-red-800 dark:text-red-300">
                  Total del Gasto:
                </span>
                <span className="text-3xl font-bold text-red-700 dark:text-red-400">
                  -${parseFloat(monto || '0').toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg"
          >
            <Receipt className="h-5 w-5 mr-2" />
            Registrar Gasto
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
