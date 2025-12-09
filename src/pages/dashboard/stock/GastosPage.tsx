import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GastoForm } from '@/components/stock/GastoForm';
import { ExportButtons } from '@/components/common/ExportButtons';
import { useStockStore } from '@/store/stockStore';
import { useAuthStore } from '@/store/authStore';
import { getDateRangeByPeriod } from '@/utils/dateHelpers';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportToCsv';
import { DollarSign, Receipt } from 'lucide-react';
import type { AreaConsumo } from '@/types/consumos';

export function GastosPage() {
  const [periodo, setPeriodo] = useState<'day' | 'week' | 'month'>('day');
  const { getGastosByDateRange, gastos: allGastos, loadGastos } = useStockStore();
  const { user } = useAuthStore();

  const area: AreaConsumo | 'GENERAL' | undefined = useMemo(() => {
    if (!user || user.role === 'ADMIN') return undefined;
    if (user.role === 'WINNE_BAR') return 'WINNE_BAR';
    if (user.role === 'BARRA_PILETA') return 'BARRA_PILETA';
    if (user.role === 'FINCA') return 'FINCA';
    if (user.role === 'RESTAURANTE') return 'RESTAURANTE';
    return undefined;
  }, [user]);

  // ✅ Cargar gastos al montar el componente y cuando cambia el área o período
  useEffect(() => {
    const { start, end } = getDateRangeByPeriod(periodo);
    loadGastos(area, start, end);
  }, [area, periodo, loadGastos]);

  const gastos = useMemo(() => {
    const { start, end } = getDateRangeByPeriod(periodo);
    return getGastosByDateRange(start, end, area);
  }, [periodo, area, getGastosByDateRange, allGastos]);

  const totalGastos = useMemo(() => {
    return gastos.reduce((sum, g) => sum + g.monto, 0);
  }, [gastos]);

  const handleExportCSV = () => {
    exportToCsv(
      gastos,
      `gastos-${periodo}`,
      [
        { key: 'fecha', label: 'Fecha' },
        { key: 'area', label: 'Área' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'monto', label: 'Monto' },
      ]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-hotel-wine-900 dark:text-hotel-wine-400">Gastos</h1>
          <p className="text-muted-foreground">
            {area ? `Área: ${area.replace('_', ' ')}` : 'Todas las áreas'}
          </p>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Hoy</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalGastos)}</div>
            <p className="text-xs text-muted-foreground mt-1">{gastos.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Registrados</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gastos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En el período</p>
          </CardContent>
        </Card>
      </div>

      <GastoForm userArea={area} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historial de Gastos</CardTitle>
          <ExportButtons onExportCSV={handleExportCSV} disabled={gastos.length === 0} />
        </CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay gastos registrados para mostrar.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.map((gasto) => (
                    <TableRow key={gasto.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(gasto.fecha)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          gasto.area === 'WINNE_BAR' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                            gasto.area === 'BARRA_PILETA' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                              gasto.area === 'FINCA' ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                gasto.area === 'RESTAURANTE' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                  'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                        }>
                          {gasto.area.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{gasto.descripcion}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700 dark:text-red-400">
                        {formatCurrency(gasto.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
