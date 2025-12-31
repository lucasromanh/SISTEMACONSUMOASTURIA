import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConsumosStore } from '@/store/consumosStore';
import { useAuthStore } from '@/store/authStore';
import type { AreaConsumo, EstadoConsumo, MetodoPago } from '@/types/consumos';
import { getTodayISO } from '@/utils/dateHelpers';
import { ShoppingCart, Receipt, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ComprobanteTransferenciaModal } from '@/components/cajas/ComprobanteTransferenciaModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';
import { ticketsService } from '@/services/tickets.service';
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

interface ConsumoFormProps {
  area: AreaConsumo;
  productosPorCategoria: Record<string, { nombre: string; precio: number }[]>;
}

interface ProductoAgregado {
  id: string;
  categoria: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

import type { PagoRegistrado } from '@/types/consumos';
interface PedidoActivo {
  id: string;
  ticketId?: number; // ID real del ticket en la BD
  nombre: string; // Nombre temporal del pedido
  productos: ProductoAgregado[];
  fechaInicio: string;
  pagos?: PagoRegistrado[];
  estado?: string;
  montoPagado?: number;
}

export function ConsumoForm({ area, productosPorCategoria }: ConsumoFormProps) {
  const { addConsumo } = useConsumosStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  // Helper: parsear montos que vienen de OCR / inputs en formatos locales
  const parseMonto = (raw: any): number => {
    if (raw == null) return 0;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim();
    if (s === '') return 0;
    // Eliminar espacios
    s = s.replace(/\s+/g, '');
    // Si contiene coma como separador decimal (es-AR), reemplazar por punto y eliminar puntos miles
    // Ej: '1.400,00' -> '1400.00'
    const commaCount = (s.match(/,/g) || []).length;
    const dotCount = (s.match(/\./g) || []).length;
    if (commaCount > 0 && dotCount > 0) {
      // Asumimos formato 1.234,56 -> eliminar puntos, reemplazar coma
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (commaCount > 0 && dotCount === 0) {
      // Podría ser '1400,00' o '1,400' -> reemplazar coma por punto
      s = s.replace(/,/g, '.');
    } else {
      // Solo puntos: determinar si el punto es separador de miles o decimal
      if (dotCount > 1) {
        // varios puntos -> eliminarlos como separadores de miles
        s = s.replace(/\./g, '');
      } else if (dotCount === 1) {
        // Un solo punto: si los dígitos después del punto son 3 -> probable separador de miles
        const parts = s.split('.');
        if (parts[1] && parts[1].length === 3) {
          s = parts.join(''); // eliminar el punto
        } else {
          // Si no, lo interpretamos como decimal y lo dejamos
        }
      }
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  // Estado para agregar productos
  const [categoria, setCategoria] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [cantidad, setCantidad] = useState('1');

  // Pedidos activos (sin habitación/cliente aún)
  const [pedidosActivos, setPedidosActivos] = useState<PedidoActivo[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<string | null>(null);

  // Modal de cierre de pedido
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [pedidoACerrar, setPedidoACerrar] = useState<string | null>(null);
  const [mostrarComprobanteTransferencia, setMostrarComprobanteTransferencia] = useState(false);
  const [habitacionOCliente, setHabitacionOCliente] = useState('');
  const [estado, setEstado] = useState<EstadoConsumo>('CARGAR_HABITACION');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');

  // Modal de confirmación de cancelación
  const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false);
  const [pedidoACancelar, setPedidoACancelar] = useState<string | null>(null);

  // ✅ Validación defensiva: asegurar que productosPorCategoria es un objeto válido
  const categoriasDisponibles = productosPorCategoria && typeof productosPorCategoria === 'object' 
    ? Object.keys(productosPorCategoria).filter(cat => productosPorCategoria[cat]?.length > 0)
    : [];
  
  const productosDisponibles = categoria && productosPorCategoria && productosPorCategoria[categoria] 
    ? productosPorCategoria[categoria] 
    : [];

  // Obtener pedido activo actual
  const pedidoActual = pedidosActivos.find(p => p.id === pedidoSeleccionado);

  // Contador para nombres de pedidos
  const [contadorPedidos, setContadorPedidos] = useState(1);

  const handleProductoChange = (nombre: string) => {
    setProductoSeleccionado(nombre);
    const producto = productosDisponibles.find((p) => p.nombre === nombre);
    if (producto) {
      setPrecioUnitario(producto.precio.toString());
    }
  };

  // Crear nuevo ticket de consumo
  const handleCrearPedidoVacio = async () => {
    if (!user) return;

    try {
      // Crear ticket en el backend
      const response = await ticketsService.createTicket({
        user_id: user.id,
        area: area,
        fecha_apertura: new Date().toISOString(),
        turno: user.username,
        notas: '',
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "❌ Error al crear ticket",
          description: response.message || 'No se pudo crear el ticket',
        });
        return;
      }

      const nuevoPedido: PedidoActivo = {
        id: `pedido-${Date.now()}`,
        ticketId: response.ticket_id, // ID real de la BD
        nombre: `Ticket #${contadorPedidos}`,
        productos: [],
        fechaInicio: new Date().toISOString(),
      };

      setPedidosActivos([...pedidosActivos, nuevoPedido]);
      setPedidoSeleccionado(nuevoPedido.id);
      setContadorPedidos(contadorPedidos + 1);

      toast({
        title: "✅ Ticket creado",
        description: `Ticket #${response.ticket_id} creado exitosamente`,
      });
    } catch (error) {
      console.error('Error al crear ticket:', error);
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: 'Error al crear el ticket',
      });
    }
  };

  // Agregar producto al pedido seleccionado
  const handleAgregarProducto = async () => {
    if (!pedidoSeleccionado) {
      toast({
        variant: "destructive",
        title: "⚠️ Ticket requerido",
        description: "Primero debe crear un ticket de consumo",
      });
      return;
    }

    if (!productoSeleccionado || !precioUnitario || !cantidad) {
      return;
    }

    const pedidoActual = pedidosActivos.find(p => p.id === pedidoSeleccionado);
    if (!pedidoActual || !pedidoActual.ticketId || !user) return;

    const cantidadNum = parseFloat(cantidad);
    const precioNum = parseFloat(precioUnitario);
    const subtotal = cantidadNum * precioNum;

    try {
      // Agregar item al ticket en el backend
      const response = await ticketsService.addTicketItem({
        user_id: user.id,
        ticket_id: pedidoActual.ticketId,
        tipo_item: 'CONSUMO',
        descripcion: `${productoSeleccionado} x${cantidadNum}`,
        monto: subtotal,
        metodo_pago: 'PENDIENTE',
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "❌ Error",
          description: response.message || 'No se pudo agregar el producto',
        });
        return;
      }

      const nuevoProducto: ProductoAgregado = {
        id: `${Date.now()}-${Math.random()}`,
        categoria,
        nombre: productoSeleccionado,
        precioUnitario: precioNum,
        cantidad: cantidadNum,
        subtotal,
      };

      // Agregar al pedido seleccionado
      setPedidosActivos(pedidosActivos.map(pedido =>
        pedido.id === pedidoSeleccionado
          ? { ...pedido, productos: [...pedido.productos, nuevoProducto] }
          : pedido
      ));

      // Limpiar campos de producto
      setCategoria('');
      setProductoSeleccionado('');
      setPrecioUnitario('');
      setCantidad('1');
    } catch (error) {
      console.error('Error al agregar producto:', error);
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: 'Error al agregar el producto al ticket',
      });
    }
  };

  const handleEliminarProducto = (productoId: string) => {
    if (!pedidoSeleccionado) return;

    setPedidosActivos(pedidosActivos.map(pedido =>
      pedido.id === pedidoSeleccionado
        ? { ...pedido, productos: pedido.productos.filter(p => p.id !== productoId) }
        : pedido
    ));
  };

  // Abrir modal para cerrar pedido
  const handleAbrirModalCierre = (pedidoId: string) => {
    const pedido = pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || pedido.productos.length === 0) {
      toast({
        variant: "destructive",
        title: "⚠️ Ticket vacío",
        description: "El pedido debe tener al menos un producto",
      });
      return;
    }
    setPedidoACerrar(pedidoId);
    setMostrarModalCierre(true);
    setHabitacionOCliente('');
    setEstado('CARGAR_HABITACION');
    setMetodoPago('EFECTIVO'); // ✅ Inicializar con valor válido
  };



  // Procesar cierre de pedido (con o sin datos de transferencia/tarjeta)
  const procesarCierrePedido = async (datosComprobanteOTarjeta: any) => {

    const pedido = pedidosActivos.find(p => p.id === pedidoACerrar);
    if (!pedido) return;


    const fechaActual = getTodayISO();
    const totalPedido = pedido.productos.reduce((sum, p) => sum + p.subtotal, 0);
    let pagos: PagoRegistrado[] = pedido.pagos || [];
    let montoPagadoAcumulado = pagos.reduce((sum: number, p: PagoRegistrado) => sum + p.monto, 0);
    let estadoFinal: string = estado;
    let montoPagadoTotal: number | null = null;

    // Si es transferencia, validar el monto y registrar pago parcial
    if (datosComprobanteOTarjeta && metodoPago === 'TRANSFERENCIA') {
      // Asegurar que el monto es número real, no string decimal
      let montoTransferencia = parseMonto(datosComprobanteOTarjeta.monto);
      // Registrar pago parcial en el array de pagos
      const nuevoPago: PagoRegistrado = {
        id: `pago-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: fechaActual,
        metodo: 'TRANSFERENCIA',
        monto: montoTransferencia,
        usuarioRegistroId: user?.id ? String(user.id) : '',
        datosTransferencia: {
          hora: datosComprobanteOTarjeta.hora,
          aliasCbu: datosComprobanteOTarjeta.aliasCbu,
          banco: datosComprobanteOTarjeta.banco,
          numeroOperacion: datosComprobanteOTarjeta.numeroOperacion,
          imagenComprobante: datosComprobanteOTarjeta.imagenComprobante,
        },
      };
      pagos = [...pagos, nuevoPago];
      montoPagadoAcumulado += montoTransferencia;

      // NOTA: El backend (create_consumo_pago.php) ya se encarga de crear
      // el movimiento de caja automáticamente en syncPagoToAreaMovementsAndCaja
      // por lo que NO necesitamos crearlo aquí

      if (montoPagadoAcumulado < totalPedido) {
        // Pago parcial
        estadoFinal = 'PAGO_PARCIAL';
        montoPagadoTotal = montoPagadoAcumulado;
        // Actualizar el pedido con los pagos acumulados
        setPedidosActivos(pedidosActivos.map(p =>
          p.id === pedidoACerrar ? { ...p, pagos, estado: estadoFinal, montoPagado: montoPagadoTotal ?? undefined } : p
        ));
        toast({
          title: "💰 Pago parcial registrado",
          description: `Se pagó $${montoPagadoAcumulado.toFixed(2)} de $${totalPedido.toFixed(2)}. Resta: $${(totalPedido - montoPagadoAcumulado).toFixed(2)}`,
          variant: "default",
        });
        setMostrarModalCierre(false);
        setPedidoACerrar(null);
        return;
      } else if (montoPagadoAcumulado > totalPedido) {
        // Advertencia si paga de más
        toast({
          title: "⚠️ Monto mayor al total",
          description: `Se transfirieron $${montoPagadoAcumulado.toFixed(2)} pero el total es $${totalPedido.toFixed(2)}`,
          variant: "destructive",
        });
      } else {
        // Pago completo con este último pago
        estadoFinal = 'PAGADO';
        montoPagadoTotal = montoPagadoAcumulado;
      }
    }

    // Si es tarjeta de crédito, validar y registrar pago
    if (datosComprobanteOTarjeta && metodoPago === 'TARJETA_CREDITO') {
      // Para tarjeta, el monto es el total del pedido (no permite pagos parciales en este flujo)
      const montoTarjeta = totalPedido;
      
      const nuevoPago: PagoRegistrado = {
        id: `pago-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: fechaActual,
        metodo: 'TARJETA_CREDITO',
        monto: montoTarjeta,
        usuarioRegistroId: user?.id ? String(user.id) : '',
        datosTarjeta: {
          cuotas: datosComprobanteOTarjeta.cuotas,
          numeroAutorizacion: datosComprobanteOTarjeta.numeroAutorizacion,
          tipoTarjeta: datosComprobanteOTarjeta.tipoTarjeta,
          marcaTarjeta: datosComprobanteOTarjeta.marcaTarjeta,
          numeroCupon: datosComprobanteOTarjeta.numeroCupon,
          estado: 'APROBADO',
          imagenComprobante: datosComprobanteOTarjeta.imagenComprobante,
        },
      };
      
      pagos = [...pagos, nuevoPago];
      montoPagadoAcumulado += montoTarjeta;
      estadoFinal = 'PAGADO';
      montoPagadoTotal = montoPagadoAcumulado;
    }

    // Función auxiliar para registrar consumos (pagados o cargados a habitación)
    const registrarConsumos = async (estadoAUsar: string, montoPagadoPorProducto?: number) => {
      for (const producto of pedido.productos) {
        const consumoData: any = {
          fecha: fechaActual,
          area,
          habitacionOCliente,
          consumoDescripcion: producto.nombre,
          categoria: producto.categoria,
          precioUnitario: producto.precioUnitario,
          cantidad: producto.cantidad,
          total: producto.subtotal,
          estado: estadoAUsar,
          montoPagado: estadoAUsar === 'PAGADO' ? (montoPagadoPorProducto ?? producto.subtotal) : undefined,
          metodoPago: estadoAUsar === 'PAGADO' ? metodoPago : undefined,
          usuarioRegistroId: user?.id ? String(user.id) : '',
          ticketId: pedido.ticketId, // Vincular consumo con ticket
          pagos: pagos,
        };
        // Si hubo pagos con transferencia o tarjeta, pasar los datos
        if (pagos && pagos.length > 0) {
          const pagosTransfer = pagos.filter(p => p.metodo === 'TRANSFERENCIA' && p.datosTransferencia);
          if (pagosTransfer.length > 0) {
            consumoData.datosTransferencia = pagosTransfer[pagosTransfer.length - 1].datosTransferencia;
          }
          
          const pagosTarjeta = pagos.filter(p => p.metodo === 'TARJETA_CREDITO' && p.datosTarjeta);
          if (pagosTarjeta.length > 0) {
            const datosTarjetaPago = pagosTarjeta[pagosTarjeta.length - 1].datosTarjeta;
            // Extraer imagen_comprobante como campo separado
            if (datosTarjetaPago) {
              const { imagenComprobante, ...datosTarjetaSinImagen } = datosTarjetaPago;
              consumoData.datosTarjeta = datosTarjetaSinImagen;
              if (imagenComprobante) {
                consumoData.imagenComprobante = imagenComprobante;
              }
            }
          }
        }
        await addConsumo(consumoData);
      }
    };

    // Cerrar ticket en el backend
    const cerrarTicket = async () => {
      if (!pedido.ticketId || !user) return;

      try {
        await ticketsService.closeTicket({
          user_id: user.id,
          ticket_id: pedido.ticketId,
          fecha_cierre: new Date().toISOString(),
          total_efectivo: metodoPago === 'EFECTIVO' ? totalPedido : 0,
          total_transferencia: metodoPago === 'TRANSFERENCIA' ? totalPedido : 0,
          total_habitacion: estadoFinal === 'CARGAR_HABITACION' ? totalPedido : 0,
          notas_cierre: `Hab/Cliente: ${habitacionOCliente}`,
        });
      } catch (error) {
        console.error('Error al cerrar ticket:', error);
      }
    };

    // Registrar consumos si está PAGADO o si se debe cargar a habitación
    if (estadoFinal === 'PAGADO') {
      await registrarConsumos('PAGADO');
      await cerrarTicket(); // Cerrar ticket en BD
      // Remover pedido y cerrar modal
      setPedidosActivos(pedidosActivos.filter(p => p.id !== pedidoACerrar));
      if (pedidoSeleccionado === pedidoACerrar) {
        setPedidoSeleccionado(null);
      }
      setMostrarModalCierre(false);
      setPedidoACerrar(null);
      toast({
        title: "✅ Pedido cerrado exitosamente",
        description: `${pedido.productos.length} producto${pedido.productos.length !== 1 ? 's' : ''} registrado${pedido.productos.length !== 1 ? 's' : ''}`,
      });
    } else if (estadoFinal === 'CARGAR_HABITACION') {
      // Registrar consumos con estado cargado a habitación
      await registrarConsumos('CARGAR_HABITACION');
      await cerrarTicket(); // Cerrar ticket en BD
      setPedidosActivos(pedidosActivos.filter(p => p.id !== pedidoACerrar));
      if (pedidoSeleccionado === pedidoACerrar) {
        setPedidoSeleccionado(null);
      }
      setMostrarModalCierre(false);
      setPedidoACerrar(null);
      toast({
        title: "✅ Pedido cargado a habitación",
        description: `${pedido.productos.length} producto${pedido.productos.length !== 1 ? 's' : ''} cargado${pedido.productos.length !== 1 ? 's' : ''}`,
      });
    } else if (estadoFinal === 'PAGO_PARCIAL') {
      // Si es pago parcial, solo cerrar el modal (los pagos parciales ya fueron registrados como movimientos)
      setMostrarModalCierre(false);
      setPedidoACerrar(null);
    } else {
      // Otros estados: remover pedido y cerrar modal por seguridad
      setPedidosActivos(pedidosActivos.filter(p => p.id !== pedidoACerrar));
      if (pedidoSeleccionado === pedidoACerrar) {
        setPedidoSeleccionado(null);
      }
      setMostrarModalCierre(false);
      setPedidoACerrar(null);
    }
  };

  // Abrir confirmación de cancelar pedido
  const handleCancelarPedido = (pedidoId: string) => {
    setPedidoACancelar(pedidoId);
    setMostrarConfirmCancelar(true);
  };

  // Confirmar cancelación de pedido
  const confirmarCancelacion = () => {
    if (pedidoACancelar) {
      setPedidosActivos(pedidosActivos.filter(p => p.id !== pedidoACancelar));
      if (pedidoSeleccionado === pedidoACancelar) {
        setPedidoSeleccionado(null);
      }
      toast({
        title: "🗑️ Pedido cancelado",
        description: "El ticket ha sido eliminado",
      });
    }
    setMostrarConfirmCancelar(false);
    setPedidoACancelar(null);
  };

  const fechaActual = new Date();
  const totalPedidoActual = pedidoActual ? pedidoActual.productos.reduce((sum, p) => sum + p.subtotal, 0) : 0;

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="border-b bg-gradient-to-r from-hotel-wine-500 to-hotel-wine-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Registrar Consumo
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1 bg-white/20 text-white border-white/30">
            <Calendar className="h-3 w-3" />
            {format(fechaActual, "d 'de' MMM", { locale: es })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-5">
          {/* Fecha actual (solo informativa) */}
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

          {/* Botón para crear nuevo ticket si no hay ninguno activo */}
          {pedidosActivos.length === 0 && (
            <div className="text-center p-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex flex-col items-center gap-4">
                <Receipt className="h-16 w-16 text-blue-500" />
                <div>
                  <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                    Crear Ticket de Consumo
                  </h3>
                  <p className="text-muted-foreground">
                    Comienza creando un ticket para empezar a cargar productos
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleCrearPedidoVacio}
                  className="h-14 px-8 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Plus className="h-6 w-6 mr-2" />
                  Crear Nuevo Ticket
                </Button>
              </div>
            </div>
          )}

          {/* Botón para crear ticket adicional cuando ya hay tickets activos */}
          {pedidosActivos.length > 0 && (
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={handleCrearPedidoVacio}
                variant="outline"
                className="h-12 px-6 border-2 border-blue-500 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Otro Ticket
              </Button>
            </div>
          )}

          {/* Tickets Activos */}
          {pedidosActivos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Tickets Activos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pedidosActivos.map((pedido) => {
                  const total = pedido.productos.reduce((sum, p) => sum + p.subtotal, 0);
                  const esActivo = pedido.id === pedidoSeleccionado;

                  return (
                    <div
                      key={pedido.id}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${esActivo
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                        }`}
                      onClick={() => setPedidoSeleccionado(pedido.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base">
                            {pedido.nombre}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pedido.productos.length} producto{pedido.productos.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            ${total.toFixed(2)}
                          </p>
                          {/* Avance de pago parcial en el resumen del ticket */}
                          {pedido.pagos && pedido.pagos.length > 0 && (
                            <div className="text-xs mt-1">
                              <span className="text-green-700 dark:text-green-400 font-semibold">Pagado: ${pedido.pagos.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}</span>
                              <span className="mx-1 text-muted-foreground">|</span>
                              <span className="text-yellow-700 dark:text-yellow-400 font-semibold">Restante: ${(total - pedido.pagos.reduce((sum, p) => sum + p.monto, 0)).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirModalCierre(pedido.id);
                            }}
                            disabled={pedido.productos.length === 0}
                            className="h-8 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            💰 Cobrar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelarPedido(pedido.id);
                            }}
                            className="h-8 text-xs"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección: Agregar Productos (solo si hay ticket seleccionado) */}
          {pedidoSeleccionado && (
            <div className="space-y-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <ShoppingCart className="h-5 w-5" />
                  Agregar Productos
                </h3>
                {pedidoActual && (
                  <Badge className="text-base bg-blue-700 text-white">
                    {pedidoActual.nombre}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-base font-semibold">
                    Categoría
                  </Label>
                  <Select value={categoria} onValueChange={setCategoria} required>
                    <SelectTrigger className="h-12 text-base border-2 focus:border-hotel-wine-500">
                      <SelectValue placeholder="Seleccione categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasDisponibles.length > 0 ? (
                        categoriasDisponibles.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-base">
                            {cat}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_empty" disabled className="text-base text-muted-foreground">
                          No hay productos disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producto" className="text-base font-semibold">
                    Producto
                  </Label>
                  <Select
                    value={productoSeleccionado}
                    onValueChange={handleProductoChange}
                    disabled={!categoria}
                    required
                  >
                    <SelectTrigger className="h-12 text-base border-2 focus:border-hotel-wine-500 disabled:opacity-50">
                      <SelectValue placeholder={categoria ? "Seleccione producto" : "Primero elija categoría"} />
                    </SelectTrigger>
                    <SelectContent>
                      {productosDisponibles.map((producto) => (
                        <SelectItem key={producto.nombre} value={producto.nombre} className="text-base">
                          <div className="flex justify-between items-center w-full gap-3">
                            <span>{producto.nombre}</span>
                            <span className="font-bold text-green-700">${producto.precio}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio" className="text-base font-semibold">
                    Precio Unitario
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      value={precioUnitario}
                      onChange={(e) => setPrecioUnitario(e.target.value)}
                      className="h-12 text-base border-2 focus:border-hotel-wine-500 pl-8"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cantidad" className="text-base font-semibold">
                    Cantidad
                  </Label>
                  <Input
                    id="cantidad"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="h-12 text-base border-2 focus:border-hotel-wine-500"
                  />
                </div>

                {/* Botón para agregar producto */}
                <div className="space-y-2 md:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAgregarProducto}
                    disabled={!productoSeleccionado || !precioUnitario || !cantidad}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar Producto a la Lista
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de productos del pedido actual */}
          {pedidoActual && pedidoActual.productos.length > 0 && (
            <div className="space-y-3 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/30 dark:bg-green-950/20">
              <div className="flex items-center justify-between border-b border-green-300 dark:border-green-700 pb-2">
                <h3 className="font-bold text-lg text-green-700 dark:text-green-400">Productos en el Pedido</h3>
                <Badge className="text-base bg-green-700 text-white">
                  {pedidoActual.productos.length} {pedidoActual.productos.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pedidoActual.productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border-2 border-green-200 dark:border-green-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {producto.categoria} • {producto.cantidad}x ${producto.precioUnitario.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-lg text-green-700 dark:text-green-400">
                        ${producto.subtotal.toFixed(2)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarProducto(producto.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total del pedido actual */}
          {pedidoActual && totalPedidoActual > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total del Pedido:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pedidoActual.productos.length} producto{pedidoActual.productos.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-4xl font-bold text-green-700 dark:text-green-400">
                  ${totalPedidoActual.toFixed(2)}
                </span>
              </div>
              {/* Avance de pago parcial */}
              {pedidoActual.pagos && pedidoActual.pagos.length > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-green-700 dark:text-green-400 font-semibold">Pagado: ${pedidoActual.pagos.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}</span>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <span className="text-yellow-700 dark:text-yellow-400 font-semibold">Restante: ${(totalPedidoActual - pedidoActual.pagos.reduce((sum, p) => sum + p.monto, 0)).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Modal de cierre de pedido */}
          <Dialog open={mostrarModalCierre} onOpenChange={setMostrarModalCierre}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Confirmar cierre de pedido
                </DialogTitle>
                <DialogDescription>
                  Revisa los datos del pedido antes de confirmar el cierre
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Total destacado */}
                {(() => {
                  const pedido = pedidosActivos.find(p => p.id === pedidoACerrar);
                  if (!pedido) return null;
                  const total = pedido.productos.reduce((sum, p) => sum + p.subtotal, 0);
                  const pagado = pedido.pagos ? pedido.pagos.reduce((sum, p) => sum + p.monto, 0) : 0;
                  const restante = total - pagado;
                  return (
                    <div className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">{pagado > 0 ? 'Restante por cobrar' : 'Total del pedido'}</div>
                      <div className={`text-3xl font-bold ${pagado > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>${(pagado > 0 ? restante : total).toFixed(2)}</div>
                      {pagado > 0 && (
                        <div className="mt-1 text-xs text-green-700 dark:text-green-400">Pagado: ${pagado.toFixed(2)}</div>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <Label htmlFor="habitacion-cierre">Habitación/Cliente</Label>
                  <Input
                    id="habitacion-cierre"
                    value={habitacionOCliente}
                    onChange={(e) => setHabitacionOCliente(e.target.value)}
                    placeholder="Ej: 101 o Juan Pérez"
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado del consumo</Label>
                  <Select value={estado} onValueChange={(value: EstadoConsumo) => setEstado(value)}>
                    <SelectTrigger id="estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CARGAR_HABITACION">🏨 Cargar a habitación</SelectItem>
                      <SelectItem value="PAGADO">💵 Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {estado === 'PAGADO' && (
                  <div>
                    <Label htmlFor="metodo-pago">Método de pago</Label>
                    <Select value={metodoPago || 'EFECTIVO'} onValueChange={(value) => setMetodoPago(value as MetodoPago)}>
                      <SelectTrigger id="metodo-pago">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                        <SelectItem value="TARJETA_CREDITO">💳 Tarjeta de Crédito/Débito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarModalCierre(false);
                    setPedidoACerrar(null);
                  }}
                >
                  Cancelar
                </Button>
                {(() => {
                  const pedidoCierre = pedidosActivos.find(p => p.id === pedidoACerrar);
                  const totalCierre = pedidoCierre ? pedidoCierre.productos.reduce((sum, p) => sum + p.subtotal, 0) : 0;
                  return (
                    <Button
                      onClick={() => {
                        if (!pedidoCierre || pedidoCierre.productos.length === 0 || totalCierre === 0) {
                          toast({
                            variant: "destructive",
                            title: "⚠️ Pedido vacío",
                            description: "El pedido debe tener al menos un producto y un total mayor a $0.00",
                          });
                          return;
                        }
                        if (estado === 'PAGADO' && (metodoPago === 'TRANSFERENCIA' || metodoPago === 'TARJETA_CREDITO')) {
                          setMostrarModalCierre(false);
                          setMostrarComprobanteTransferencia(true);
                        } else {
                          procesarCierrePedido(null);
                        }
                      }}
                      disabled={!habitacionOCliente.trim() || !pedidoCierre || pedidoCierre.productos.length === 0 || totalCierre === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar y cerrar
                    </Button>
                  );
                })()}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AlertDialog de confirmación de cancelación */}
          <AlertDialog open={mostrarConfirmCancelar} onOpenChange={setMostrarConfirmCancelar}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  ¿Está seguro de cancelar este pedido?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará el ticket y todos los productos agregados. No se podrá deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setMostrarConfirmCancelar(false);
                  setPedidoACancelar(null);
                }}>
                  No, mantener
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmarCancelacion}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sí, cancelar ticket
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal de comprobante de transferencia o tarjeta */}
          <ComprobanteTransferenciaModal
            open={mostrarComprobanteTransferencia}
            esTarjeta={metodoPago === 'TARJETA_CREDITO'}
            onOpenChange={(open) => {
              setMostrarComprobanteTransferencia(open);
              // ✅ CORREGIDO: No reabrir el modal de cierre automáticamente
              // Si el usuario cancela, debe volver a hacer clic en "Cobrar"
            }}
            onConfirmar={(datos) => {
              setMostrarComprobanteTransferencia(false);
              procesarCierrePedido(datos);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
