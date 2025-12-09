import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { stockService, type CreateStockItemRequest, type UpdateStockItemRequest } from '@/services/stock.service';
import { useAuthStore } from '@/store/authStore';

interface ProductFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: {
        id: number;
        area: string;
        nombre: string;
        categoria: string;
        unidad: string;
        stock_actual: number;
        stock_minimo: number;
    };
    onSuccess: () => void;
}

const AREAS = [
    { value: 'WINNE_BAR', label: 'Winne Bar' },
    { value: 'BARRA_PILETA', label: 'Barra Pileta' },
    { value: 'FINCA', label: 'La Finca' },
    { value: 'RESTAURANTE', label: 'Restaurante' },
    { value: 'GENERAL', label: 'General (Todas las áreas)' },
];

const CATEGORIAS_COMUNES = [
    'Bebidas',
    'Café',
    'Tragos',
    'Gaseosas',
    'Whisky',
    'Vinos',
    'Cervezas',
    'Comida',
    'Snacks',
    'Postres',
    'Otros',
];

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: ProductFormProps) {
    const currentUser = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        area: 'WINNE_BAR',
        nombre: '',
        categoria: '',
        unidad: 'unidad',
        precio_unitario: '',
        stock_actual: '',
        stock_minimo: '',
    });

    useEffect(() => {
        if (product) {
            setFormData({
                area: product.area,
                nombre: product.nombre,
                categoria: product.categoria,
                unidad: product.unidad,
                precio_unitario: (product as any).precio_unitario?.toString() || '',
                stock_actual: product.stock_actual.toString(),
                stock_minimo: product.stock_minimo.toString(),
            });
        } else {
            setFormData({
                area: 'WINNE_BAR',
                nombre: '',
                categoria: '',
                unidad: 'unidad',
                precio_unitario: '',
                stock_actual: '',
                stock_minimo: '',
            });
        }
        setError('');
    }, [product, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        setError('');

        try {
            const stockActual = parseFloat(formData.stock_actual) || 0;
            const stockMinimo = parseFloat(formData.stock_minimo) || 0;
            const precioUnitario = parseFloat(formData.precio_unitario) || 0;

            if (product) {
                // Actualizar producto existente
                const updateData: UpdateStockItemRequest = {
                    admin_id: currentUser.id,
                    id: product.id,
                    area: formData.area,
                    nombre: formData.nombre,
                    categoria: formData.categoria,
                    unidad: formData.unidad,
                    stock_actual: stockActual,
                    stock_minimo: stockMinimo,
                };

                // Agregar precio si el backend lo soporta
                (updateData as any).precio_unitario = precioUnitario;

                const result = await stockService.updateStockItem(updateData);
                if (result.success) {
                    onSuccess();
                    onOpenChange(false);
                } else {
                    setError(result.message || 'Error al actualizar producto');
                }
            } else {
                // Crear nuevo producto
                const createData: CreateStockItemRequest = {
                    admin_id: currentUser.id,
                    area: formData.area,
                    nombre: formData.nombre,
                    categoria: formData.categoria,
                    unidad: formData.unidad,
                    stock_actual: stockActual,
                    stock_minimo: stockMinimo,
                };

                // Agregar precio si el backend lo soporta
                (createData as any).precio_unitario = precioUnitario;

                const result = await stockService.createStockItem(createData);
                if (result.success) {
                    onSuccess();
                    onOpenChange(false);
                } else {
                    setError(result.message || 'Error al crear producto');
                }
            }
        } catch (err) {
            setError('Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{product ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                        {product ? 'Modifica los datos del producto' : 'Completa los datos para crear un nuevo producto'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del producto</Label>
                        <Input
                            id="nombre"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            required
                            placeholder="Ej: Café Americano"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoría</Label>
                            <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIAS_COMUNES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area">Área</Label>
                            <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AREAS.map((area) => (
                                        <SelectItem key={area.value} value={area.value}>
                                            {area.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unidad">Unidad</Label>
                            <Input
                                id="unidad"
                                value={formData.unidad}
                                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                                required
                                placeholder="unidad, litro, kg..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="precio_unitario">Precio por unidad ($)</Label>
                            <Input
                                id="precio_unitario"
                                type="number"
                                value={formData.precio_unitario}
                                onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stock_actual">Stock actual</Label>
                            <Input
                                id="stock_actual"
                                type="number"
                                value={formData.stock_actual}
                                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                                placeholder="0"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="stock_minimo">Stock mínimo</Label>
                            <Input
                                id="stock_minimo"
                                type="number"
                                value={formData.stock_minimo}
                                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                                placeholder="0"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : product ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
