import { AreaDashboard } from '@/components/consumos/AreaDashboard';

const productos = {
  Tragos: [
    { nombre: 'Gin Tonic', precio: 1200 },
    { nombre: 'Mojito', precio: 1000 },
    { nombre: 'Old Fashioned', precio: 1300 },
    { nombre: 'Negroni', precio: 1250 },
  ],
  Licuados: [
    { nombre: 'Licuado Natural', precio: 700 },
    { nombre: 'Smoothie', precio: 800 },
    { nombre: 'Batido de Frutas', precio: 750 },
  ],
  Aguas: [
    { nombre: 'Agua Mineral', precio: 300 },
    { nombre: 'Agua Saborizada', precio: 350 },
  ],
  Bebidas: [
    { nombre: 'Coca Cola', precio: 400 },
    { nombre: 'Cerveza Artesanal', precio: 800 },
    { nombre: 'Vino Copa', precio: 600 },
  ],
};

export function FincaDashboardPage() {
  return <AreaDashboard area="FINCA" titulo="La Finca" productosPorCategoria={productos} />;
}
