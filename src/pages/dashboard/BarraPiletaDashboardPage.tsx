import { AreaDashboard } from '@/components/consumos/AreaDashboard';

const productos = {
  Tragos: [
    { nombre: 'Piña Colada', precio: 1200 },
    { nombre: 'Mojito', precio: 1000 },
    { nombre: 'Margarita', precio: 1100 },
    { nombre: 'Caipirinha', precio: 950 },
  ],
  Licuados: [
    { nombre: 'Licuado de Frutilla', precio: 700 },
    { nombre: 'Licuado de Banana', precio: 650 },
    { nombre: 'Licuado de Durazno', precio: 700 },
    { nombre: 'Smoothie Tropical', precio: 800 },
  ],
  Aguas: [
    { nombre: 'Agua Mineral', precio: 300 },
    { nombre: 'Agua Saborizada', precio: 350 },
    { nombre: 'Agua con Gas', precio: 300 },
  ],
  Gaseosas: [
    { nombre: 'Coca Cola', precio: 400 },
    { nombre: 'Sprite', precio: 400 },
    { nombre: 'Fanta', precio: 400 },
  ],
};

export function BarraPiletaDashboardPage() {
  return <AreaDashboard area="BARRA_PILETA" titulo="Barra Pileta" productosPorCategoria={productos} />;
}
