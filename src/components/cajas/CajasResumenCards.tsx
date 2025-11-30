import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { ResumenCaja } from '@/types/cajas';

interface CajasResumenCardsProps {
  resumen: ResumenCaja;
}

export function CajasResumenCards({ resumen }: CajasResumenCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Efectivo</CardTitle>
          <Wallet className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(resumen.totalIngresosEfectivo)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Transferencia</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(resumen.totalIngresosTransferencia)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Egresos</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(resumen.totalEgresos)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Neto</CardTitle>
          <DollarSign className="h-4 w-4 text-hotel-wine-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-hotel-wine-800">
            {formatCurrency(resumen.totalNeto)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
