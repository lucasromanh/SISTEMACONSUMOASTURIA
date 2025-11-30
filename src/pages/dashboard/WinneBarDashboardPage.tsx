import { AreaDashboard } from '@/components/consumos/AreaDashboard';

const productos = {
  Café: [
    { nombre: 'Café Americano', precio: 450 },
    { nombre: 'Café Cortado', precio: 400 },
    { nombre: 'Capuccino', precio: 550 },
    { nombre: 'Café con Leche', precio: 500 },
  ],
  Tragos: [
    { nombre: 'Fernet', precio: 800 },
    { nombre: 'Gin Tonic', precio: 1200 },
    { nombre: 'Mojito', precio: 1000 },
    { nombre: 'Daiquiri', precio: 1100 },
  ],
  Gaseosas: [
    { nombre: 'Coca Cola', precio: 400 },
    { nombre: 'Sprite', precio: 400 },
    { nombre: 'Fanta', precio: 400 },
    { nombre: 'Agua con Gas', precio: 350 },
  ],
  Whisky: [
    { nombre: 'Johnnie Walker Red', precio: 1500 },
    { nombre: 'Chivas Regal', precio: 2000 },
    { nombre: 'Jack Daniels', precio: 1800 },
  ],
  Snacks: [
    { nombre: 'Tostado Jamón y Queso', precio: 800 },
    { nombre: 'Sandwich Miga', precio: 600 },
    { nombre: 'Maní', precio: 300 },
  ],
};

export function WinneBarDashboardPage() {
  return <AreaDashboard area="WINNE_BAR" titulo="Winne Bar" productosPorCategoria={productos} />;
}
