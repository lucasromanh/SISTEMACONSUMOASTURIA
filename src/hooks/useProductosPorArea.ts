import { useState, useEffect } from 'react';
import { stockService } from '@/services/stock.service';
import { useAuthStore } from '@/store/authStore';
import type { AreaConsumo } from '@/types/consumos';

export function useProductosPorArea(area?: AreaConsumo) {
    const { user } = useAuthStore();
    const [productosPorCategoria, setProductosPorCategoria] = useState<Record<string, { nombre: string; precio: number }[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProductos = async () => {
            if (!user) return;

            try {
                setLoading(true);

                // Cargar todos los productos sin filtrar por área
                const result = await stockService.listStockItems({
                    user_id: user.id,
                });

                if (result.success) {
                    // Filtrar productos: incluir los del área específica + los de GENERAL
                    const productosDelArea = result.items.filter(item =>
                        item.area === area || item.area === 'GENERAL'
                    );

                    // Agrupar productos por categoría
                    const grouped: Record<string, { nombre: string; precio: number }[]> = {};

                    productosDelArea.forEach((item) => {
                        const categoria = item.categoria;
                        const precio = parseFloat((item as any).precio_unitario || '0');

                        if (!grouped[categoria]) {
                            grouped[categoria] = [];
                        }

                        grouped[categoria].push({
                            nombre: item.nombre,
                            precio: precio,
                        });
                    });

                    setProductosPorCategoria(grouped);
                }
            } catch (error) {
                console.error('Error al cargar productos:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProductos();
    }, [user, area]);

    return { productosPorCategoria, loading };
}
