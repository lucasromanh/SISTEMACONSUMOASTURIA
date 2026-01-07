import { create } from 'zustand';
import type { Consumo, AreaConsumo } from '@/types/consumos';
import type { MovimientoCaja } from '@/types/cajas';
import { consumosService } from '@/services/consumos.service';
import { useAuthStore } from './authStore';
import { movimientosService } from '@/services/movimientos.service';

interface ConsumosStore {
  consumos: Consumo[];
  addConsumo: (consumo: Omit<Consumo, 'id'>) => Promise<void>;
  updateConsumo: (id: string, updates: Partial<Consumo>) => void;
  getConsumosByArea: (area: AreaConsumo) => Consumo[];
  getConsumosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => Consumo[];
  loadConsumos: (area?: AreaConsumo, startDate?: string, endDate?: string) => Promise<void>;
}

export const useConsumosStore = create<ConsumosStore>((set, get) => ({
  consumos: [],

  addConsumo: async (consumoData) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }

      // Preparar datos para el backend
      const backendData: any = {
        user_id: user.id,
        fecha: consumoData.fecha,
        area: consumoData.area,
        habitacion_cliente: consumoData.habitacionOCliente,
        consumo_descripcion: consumoData.consumoDescripcion,
        categoria: consumoData.categoria,
        precio_unitario: consumoData.precioUnitario,
        cantidad: consumoData.cantidad,
        estado: consumoData.estado,
        ticket_id: consumoData.ticketId,
        // ✅ Solo enviar metodo_pago si tiene un valor válido
        metodo_pago: consumoData.metodoPago || null,
        monto_pagado: consumoData.montoPagado,
      };

      // Agregar datos de tarjeta si existen
      if (consumoData.datosTarjeta) {
        backendData.datos_tarjeta = consumoData.datosTarjeta;
      }

      // Agregar imagen de comprobante si existe
      if (consumoData.imagenComprobante) {
        backendData.imagen_comprobante = consumoData.imagenComprobante;
      }

      // Agregar datos de transferencia si existen (legacy)
      if (consumoData.datosTransferencia) {
        backendData.hora = consumoData.datosTransferencia.hora;
        backendData.alias_cbu = consumoData.datosTransferencia.aliasCbu;
        backendData.banco = consumoData.datosTransferencia.banco;
        backendData.numero_operacion = consumoData.datosTransferencia.numeroOperacion;
        if (consumoData.datosTransferencia.imagenComprobante) {
          backendData.imagen_comprobante = consumoData.datosTransferencia.imagenComprobante;
        }
      }

      // 🐛 DEBUG: Ver qué se envía al backend
      console.log('📤 Datos enviados al backend:', {
        metodo_pago: backendData.metodo_pago,
        estado: backendData.estado,
        tiene_datos_tarjeta: !!backendData.datos_tarjeta,
        tiene_imagen_comprobante: !!backendData.imagen_comprobante,
      });

      // Llamar al backend para crear el consumo
      const response = await consumosService.createConsumo(backendData);

      if (!response.success) {
        console.error('Error al crear consumo en backend:', response.message);
        return;
      }

      // Crear consumo con el ID real del backend
      const newConsumo: Consumo = {
        ...consumoData,
        id: response.id.toString(),
      };

      set((state) => ({
        consumos: [...state.consumos, newConsumo],
      }));

      // Agregar movimiento de caja para todos los consumos
      const { addMovimiento } = useCajasStore.getState();

      if (newConsumo.estado === 'PAGADO' && newConsumo.montoPagado) {
        // Consumo pagado inmediatamente
        // No registrar movimiento duplicado si ya se registró para transferencias en pagos parciales
        const yaRegistradoTransferencia = newConsumo.pagos?.some(p => p.metodo === 'TRANSFERENCIA') ?? false;
        if (!yaRegistradoTransferencia) {
          addMovimiento({
            fecha: newConsumo.fecha,
            area: newConsumo.area,
            tipo: 'INGRESO',
            origen: 'CONSUMO',
            descripcion: `${newConsumo.consumoDescripcion} - ${newConsumo.habitacionOCliente}`,
            monto: newConsumo.montoPagado,
            metodoPago: newConsumo.metodoPago || 'EFECTIVO',
          });
        }
      } else if (newConsumo.estado === 'CARGAR_HABITACION') {
        // Consumo cargado a habitación (pendiente de cobro)
        addMovimiento({
          fecha: newConsumo.fecha,
          area: newConsumo.area,
          tipo: 'INGRESO',
          origen: 'CONSUMO',
          descripcion: `${newConsumo.consumoDescripcion} - Hab. ${newConsumo.habitacionOCliente} (Pendiente)`,
          monto: newConsumo.total,
          metodoPago: undefined,
        });
      }
    } catch (error) {
      console.error('Error al agregar consumo:', error);
    }
  },

  updateConsumo: (id, updates) => {
    set((state) => ({
      consumos: state.consumos.map((consumo) =>
        consumo.id === id ? { ...consumo, ...updates } : consumo
      ),
    }));

    // Si se actualiza a PAGADO, agregar movimiento de caja
    const consumoActualizado = get().consumos.find(c => c.id === id);
    if (consumoActualizado && updates.estado === 'PAGADO' && consumoActualizado.montoPagado) {
      const { addMovimiento } = useCajasStore.getState();
      addMovimiento({
        fecha: new Date().toISOString().split('T')[0], // Usar fecha actual para el pago
        area: consumoActualizado.area,
        tipo: 'INGRESO',
        origen: 'CONSUMO',
        descripcion: `Pago habitación - ${consumoActualizado.consumoDescripcion} - ${consumoActualizado.habitacionOCliente}`,
        monto: consumoActualizado.montoPagado,
        metodoPago: consumoActualizado.metodoPago || 'EFECTIVO', // Asegurar que tenga método de pago
      });
    }
  },

  getConsumosByArea: (area) => {
    return get().consumos.filter((c) => c.area === area);
  },

  getConsumosByDateRange: (startDate, endDate, area) => {
    return get().consumos.filter((c) => {
      const consumoDate = c.fecha;
      const matchesDate = consumoDate >= startDate && consumoDate <= endDate;
      const matchesArea = area ? c.area === area : true;
      return matchesDate && matchesArea;
    });
  },

  loadConsumos: async (area, startDate, endDate) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const response = await consumosService.listConsumos({
        user_id: user.id,
        area: area,
        from: startDate,
        to: endDate,
      });

      if (response.success && response.consumos) {
        // 🔍 DEBUG: Ver qué llega del backend
        console.log('📥 CONSUMOS RECIBIDOS DEL BACKEND:', response.consumos.length);
        console.log('📥 PRIMEROS 3 CONSUMOS RAW:', response.consumos.slice(0, 3));

        const consumosFormatted: Consumo[] = response.consumos.map((c) => {
          // 🔍 DEBUG: Ver transformación de metodo_pago
          const metodoPagoRaw = c.metodo_pago;
          const metodoPagoProcessed = (c.metodo_pago ? String(c.metodo_pago).trim() : null) as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CARGAR_HABITACION' | null;

          console.log(`📝 Consumo #${c.id}: metodo_pago RAW="${metodoPagoRaw}" → PROCESSED="${metodoPagoProcessed}", estado="${c.estado}"`);

          return {
            id: c.id.toString(),
            fecha: c.fecha.split(' ')[0],
            area: c.area as AreaConsumo,
            habitacionOCliente: c.habitacion_cliente,
            consumoDescripcion: c.consumo_descripcion,
            categoria: c.categoria,
            precioUnitario: c.precio_unitario,
            cantidad: c.cantidad,
            total: c.total,
            estado: c.estado as 'CARGAR_HABITACION' | 'PAGADO' | 'PAGO_PARCIAL',
            montoPagado: c.monto_pagado || null,
            metodoPago: metodoPagoProcessed,
            usuarioRegistroId: c.usuario_registro_id.toString(),
            ticketId: c.ticket_id || undefined,
            datosTarjeta: c.datosTarjeta,
            datosTransferencia: c.datosTransferencia,
            imagenComprobante: c.imagen_comprobante,
          };
        });

        console.log('✅ CONSUMOS FORMATEADOS:', consumosFormatted.length);
        console.log('✅ PRIMEROS 3 FORMATEADOS:', consumosFormatted.slice(0, 3).map(c => ({
          id: c.id,
          estado: c.estado,
          metodoPago: c.metodoPago,
          montoPagado: c.montoPagado
        })));

        // ✅ ACTUALIZAR STORE DE CONSUMOS
        set({ consumos: consumosFormatted });


      }
    } catch (error) {
      console.error('Error al cargar consumos:', error);
    }
  },
}));

// Store separado para cajas
interface CajasStore {
  movimientos: MovimientoCaja[];
  addMovimiento: (movimiento: Omit<MovimientoCaja, 'id'>) => void;
  getMovimientosByArea: (area: AreaConsumo) => MovimientoCaja[];
  getMovimientosByDateRange: (startDate: string, endDate: string, area?: AreaConsumo) => MovimientoCaja[];
  marcarComoSincronizados: (ids: string[]) => void;
  loadMovimientos: (area?: AreaConsumo, startDate?: string, endDate?: string) => Promise<void>;
  setMovimientos: (movimientos: MovimientoCaja[]) => void;
}

export const useCajasStore = create<CajasStore>((set, get) => ({
  movimientos: [],

  setMovimientos: (nuevosMovimientos) => {
    set({ movimientos: nuevosMovimientos });
  },

  addMovimiento: (movimientoData) => {
    const newMovimiento: MovimientoCaja = {
      ...movimientoData,
      id: `movimiento-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      movimientos: [...state.movimientos, newMovimiento],
    }));
  },

  getMovimientosByArea: (area) => {
    return get().movimientos.filter((m) => m.area === area);
  },

  getMovimientosByDateRange: (startDate, endDate, area) => {
    return get().movimientos.filter((m) => {
      const getNormalizedDate = (dateStr: string) => {
        if (dateStr.includes('-')) return dateStr;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
      const movDate = getNormalizedDate(m.fecha);
      const matchesDate = movDate >= startDate && movDate <= endDate;
      const matchesArea = area ? m.area?.toUpperCase() === area?.toUpperCase() : true;
      return matchesDate && matchesArea;
    });
  },

  marcarComoSincronizados: (ids) => {
    const fechaSincronizacion = new Date().toISOString();
    set((state) => ({
      movimientos: state.movimientos.map((m) =>
        ids.includes(m.id)
          ? { ...m, sincronizado: true, fechaSincronizacion }
          : m
      ),
    }));
  },

  loadMovimientos: async (area, startDate, endDate) => {
    try {
      console.log('🔄 Cargando movimientos reales desde backend:', { area, startDate, endDate });
      const user = useAuthStore.getState().user;

      const response = await movimientosService.listMovimientos({
        user_id: user?.id,
        area,
        from: startDate,
        to: endDate
      });

      if (response.success && response.movements) {
        console.log('📥 Movimientos recibidos:', response.movements.length);

        const nuevosMovimientos: MovimientoCaja[] = response.movements.map((m: any) => ({
          id: m.id?.toString() || `mov-${Math.random()}`,
          fecha: m.fecha,
          area: m.area as AreaConsumo,
          tipo: m.tipo,
          origen: m.origen as 'CONSUMO' | 'GASTO' | 'INICIAL' | 'TRANSFERENCIA' | 'AJUSTE',
          descripcion: m.descripcion,
          monto: Number(m.monto),
          metodoPago: (m.metodo_pago ? String(m.metodo_pago).trim() : undefined) as any,
          usuario: user?.username, // Usar username
          sincronizado: m.sincronizado || false,
          fechaSincronizacion: m.fecha_sincronizacion
        }));

        set({ movimientos: nuevosMovimientos });
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
  },
}));
