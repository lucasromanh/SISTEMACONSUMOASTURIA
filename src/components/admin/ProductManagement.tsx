import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ShoppingCart, AlertTriangle } from 'lucide-react';
import { stockService, type StockItemBackend } from '@/services/stock.service';
import { useAuthStore } from '@/store/authStore';
import { ProductFormDialog } from './ProductFormDialog';

const AREA_LABELS: Record<string, string> = {
    WINNE_BAR: 'Winne Bar',
    BARRA_PILETA: 'Barra Pileta',
    FINCA: 'La Finca',
    RESTAURANTE: 'Restaurante',
    GENERAL: 'General',
};

export function ProductManagement() {
    const currentUser = useAuthStore((state) => state.user);
    const [products, setProducts] = useState<StockItemBackend[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StockItemBackend | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<StockItemBackend | null>(null);

    const loadProducts = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const result = await stockService.listStockItems({
                user_id: currentUser.id,
            });
            if (result.success) {
                setProducts(result.items);
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, [currentUser]);

    const handleEdit = (product: StockItemBackend) => {
        setSelectedProduct(product);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedProduct(undefined);
        setFormOpen(true);
    };

    const handleDeleteClick = (product: StockItemBackend) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!currentUser || !productToDelete) return;

        try {
            const result = await stockService.deleteStockItem(currentUser.id, productToDelete.id);
            if (result.success) {
                await loadProducts();
                setDeleteDialogOpen(false);
                setProductToDelete(null);
            }
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    };

    const handleFormSuccess = () => {
        loadProducts();
    };

    if (currentUser?.role !== 'ADMIN') {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-muted-foreground">No tienes permisos para gestionar productos.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Gestión de Productos
                            </CardTitle>
                            <CardDescription>Administra los productos y categorías de todas las áreas</CardDescription>
                        </div>
                        <Button onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Producto
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No hay productos registrados</div>
                    ) : (
                        <div className="rounded-md border">
                            <div className="rounded-md border">
                                {/* Vista Desktop - Tabla */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead>Área</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead>Stock Actual</TableHead>
                                                <TableHead>Stock Mínimo</TableHead>
                                                <TableHead>Unidad</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product) => {
                                                const lowStock = product.stock_actual < product.stock_minimo;
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {lowStock && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                                                {product.nombre}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{product.categoria}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {AREA_LABELS[product.area] || product.area}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-green-700 dark:text-green-400">
                                                            {(product as any).precio_unitario ? `$${parseFloat((product as any).precio_unitario).toFixed(2)}` : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={lowStock ? 'text-red-600 font-semibold' : ''}>
                                                                {product.stock_actual}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{product.stock_minimo}</TableCell>
                                                        <TableCell className="text-muted-foreground">{product.unidad}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(product)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteClick(product)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Vista Móvil - Tarjetas */}
                                <div className="md:hidden space-y-3 p-3 bg-gray-50/50 dark:bg-black/20">
                                    {products.map((product) => {
                                        const lowStock = product.stock_actual < product.stock_minimo;
                                        return (
                                            <div key={product.id} className="p-4 border rounded-lg space-y-3 bg-card shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {lowStock && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                                            <p className="font-semibold text-lg">{product.nombre}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {AREA_LABELS[product.area] || product.area}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <p className="font-bold text-lg text-green-700 dark:text-green-400">
                                                            {(product as any).precio_unitario ? `$${parseFloat((product as any).precio_unitario).toFixed(2)}` : '-'}
                                                        </p>
                                                        <Badge variant="outline" className="mt-1">{product.categoria}</Badge>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Stock Actual</p>
                                                        <p className={`font-semibold ${lowStock ? 'text-red-600' : ''}`}>
                                                            {product.stock_actual} {product.unidad}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Stock Mínimo</p>
                                                        <p>{product.stock_minimo} {product.unidad}</p>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(product)}
                                                        className="flex-1"
                                                    >
                                                        <Pencil className="h-3 w-3 mr-2" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(product)}
                                                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ProductFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                product={selectedProduct}
                onSuccess={handleFormSuccess}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar el producto <strong>{productToDelete?.nombre}</strong>?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
