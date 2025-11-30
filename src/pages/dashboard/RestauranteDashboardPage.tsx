import { AreaDashboard } from '@/components/consumos/AreaDashboard';

const productos = {
  Entradas: [
    { nombre: 'Ensalada Caesar', precio: 1200 },
    { nombre: 'Provoleta', precio: 1000 },
    { nombre: 'Tabla de Fiambres', precio: 1800 },
  ],
  'Platos Principales': [
    { nombre: 'Bife de Chorizo', precio: 3500 },
    { nombre: 'Pollo Grillado', precio: 2800 },
    { nombre: 'Pescado del Día', precio: 3200 },
    { nombre: 'Ravioles', precio: 2400 },
    { nombre: 'Milanesa Napolitana', precio: 2600 },
  ],
  Postres: [
    { nombre: 'Tiramisú', precio: 900 },
    { nombre: 'Flan con Crema', precio: 700 },
    { nombre: 'Helado', precio: 800 },
  ],
  Bebidas: [
    { nombre: 'Coca Cola', precio: 400 },
    { nombre: 'Agua Mineral', precio: 300 },
    { nombre: 'Vino Copa', precio: 600 },
    { nombre: 'Cerveza', precio: 500 },
  ],
  Vinos: [
    { nombre: 'Vino Malbec Botella', precio: 2500 },
    { nombre: 'Vino Cabernet Botella', precio: 2300 },
    { nombre: 'Vino Blanco Botella', precio: 2200 },
  ],
};

export function RestauranteDashboardPage() {
  return <AreaDashboard area="RESTAURANTE" titulo="Restaurante" productosPorCategoria={productos} />;
}
