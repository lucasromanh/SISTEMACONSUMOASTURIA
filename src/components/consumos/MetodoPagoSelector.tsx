import { useState, createContext, useContext, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CreditCard, Upload, AlertCircle } from 'lucide-react';
import { ComprobanteTransferenciaModal } from '@/components/cajas/ComprobanteTransferenciaModal';
import type { MetodoPago, DatosTarjeta, DatosTransferencia } from '@/types/consumos';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Radio Group Components (inline para evitar problemas de import)
interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          role="radiogroup"
          className={className}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const isChecked = context.value === value;

    return (
      <input
        ref={ref}
        type="radio"
        id={id}
        value={value}
        checked={isChecked}
        onChange={(e) => {
          if (e.target.checked && context.onValueChange) {
            context.onValueChange(value);
          }
        }}
        className={`h-4 w-4 rounded-full border border-primary ${className || ''}`}
        {...props}
      />
    );
  }
);

interface MetodoPagoSelectorProps {
  metodoSeleccionado: MetodoPago;
  onMetodoChange: (metodo: MetodoPago) => void;
  imagenComprobante?: string;
  onImagenChange: (imagen: string | undefined) => void;
  datosTarjeta?: DatosTarjeta;
  onDatosTarjetaChange?: (datos: Partial<DatosTarjeta>) => void;
  datosTransferencia?: DatosTransferencia;
  onDatosTransferenciaChange?: (datos: DatosTransferencia) => void;
}

export function MetodoPagoSelector({
  metodoSeleccionado,
  onMetodoChange,
  imagenComprobante,
  onImagenChange,
  datosTarjeta,
  onDatosTarjetaChange,
  datosTransferencia,
  onDatosTransferenciaChange,
}: MetodoPagoSelectorProps) {
  const [erroresTarjeta, setErroresTarjeta] = useState<string[]>([]);
  const [mostrarModalTransferencia, setMostrarModalTransferencia] = useState(false);
  const [mostrarCapturaTarjeta, setMostrarCapturaTarjeta] = useState(false);

  const handleMetodoChange = (metodo: string) => {
    onMetodoChange(metodo as MetodoPago);
    
    // Limpiar datos al cambiar de método
    if (metodo !== 'TARJETA_CREDITO') {
      onDatosTarjetaChange?.({
        cuotas: 1,
        numeroAutorizacion: '',
        tipoTarjeta: 'CREDITO',
        marcaTarjeta: '',
        numeroCupon: '',
        estado: 'APROBADO',
      });
      setErroresTarjeta([]);
    }
    if (metodo !== 'TRANSFERENCIA') {
      onDatosTransferenciaChange?.({
        aliasCbu: '',
        banco: '',
        numeroOperacion: '',
        hora: '',
        imagenComprobante: '',
      });
    }
    if (metodo !== 'TRANSFERENCIA' && metodo !== 'TARJETA_CREDITO') {
      onImagenChange(undefined);
    }
  };

  const handleDatosTarjetaChange = (cambios: Partial<DatosTarjeta>) => {
    onDatosTarjetaChange?.(cambios);
    
    // Limpiar errores al comenzar a completar
    if (erroresTarjeta.length > 0) {
      setTimeout(() => setErroresTarjeta([]), 100);
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={metodoSeleccionado || 'EFECTIVO'} onValueChange={handleMetodoChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="EFECTIVO" id="efectivo" />
          <Label htmlFor="efectivo" className="cursor-pointer">Efectivo</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="TRANSFERENCIA" id="transferencia" />
          <Label htmlFor="transferencia" className="cursor-pointer">Transferencia</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="TARJETA_CREDITO" id="tarjeta" />
          <Label htmlFor="tarjeta" className="cursor-pointer flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Tarjeta de Crédito/Débito
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="CARGAR_HABITACION" id="habitacion" />
          <Label htmlFor="habitacion" className="cursor-pointer">Cargar a Habitación</Label>
        </div>
      </RadioGroup>

      {/* Campos específicos para Tarjeta de Crédito */}
      {metodoSeleccionado === 'TARJETA_CREDITO' && (
        <Card className="p-4 space-y-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
            <CreditCard className="h-5 w-5" />
            <span>Datos del Pago con Tarjeta</span>
          </div>

          {erroresTarjeta.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {erroresTarjeta.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuotas">Cuotas *</Label>
              <Input
                id="cuotas"
                type="number"
                min="1"
                max="24"
                value={datosTarjeta?.cuotas || 1}
                onChange={(e) => handleDatosTarjetaChange({
                  ...datosTarjeta,
                  cuotas: parseInt(e.target.value) || 1,
                })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autorizacion">N° Autorización *</Label>
              <Input
                id="autorizacion"
                placeholder="Ej: 123456"
                value={datosTarjeta?.numeroAutorizacion || ''}
                onChange={(e) => handleDatosTarjetaChange({
                  ...datosTarjeta,
                  numeroAutorizacion: e.target.value,
                })}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoTarjeta">Tipo de Tarjeta *</Label>
              <select
                id="tipoTarjeta"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={datosTarjeta?.tipoTarjeta || ''}
                onChange={(e) => handleDatosTarjetaChange({
                  ...datosTarjeta,
                  tipoTarjeta: e.target.value as 'CREDITO' | 'DEBITO',
                })}
              >
                <option value="">Seleccionar...</option>
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marcaTarjeta">Marca *</Label>
              <select
                id="marcaTarjeta"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={datosTarjeta?.marcaTarjeta || ''}
                onChange={(e) => handleDatosTarjetaChange({
                  ...datosTarjeta,
                  marcaTarjeta: e.target.value,
                })}
              >
                <option value="">Seleccionar...</option>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="AMEX">American Express</option>
                <option value="CABAL">Cabal</option>
                <option value="NARANJA">Naranja</option>
                <option value="MAESTRO">Maestro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroCupon">N° Cupón (Opcional)</Label>
            <Input
              id="numeroCupon"
              placeholder="Ej: 001234567"
              value={datosTarjeta?.numeroCupon || ''}
              onChange={(e) => handleDatosTarjetaChange({
                ...datosTarjeta,
                numeroCupon: e.target.value,
              })}
              className="w-full"
            />
          </div>

          {/* Captura de Comprobante de Tarjeta */}
          <div className="border-t pt-4 space-y-2">
            <Label>Comprobante del Posnet</Label>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => setMostrarCapturaTarjeta(true)}
            >
              <Upload className="h-4 w-4" />
              {imagenComprobante ? 'Cambiar Comprobante' : 'Adjuntar Comprobante del Posnet'}
            </Button>
            {imagenComprobante && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="text-lg">✓</span> Comprobante adjuntado correctamente
              </p>
            )}
          </div>

          {/* Modal de captura para tarjeta (reutiliza el de transferencia pero con título distinto) */}
          <ComprobanteTransferenciaModal
            open={mostrarCapturaTarjeta}
            onOpenChange={setMostrarCapturaTarjeta}
            esTarjeta={true}
            onConfirmar={(datos) => {
              // Solo guardamos la imagen, los otros datos ya están en datosTarjeta
              if (datos.imagenComprobante) {
                onImagenChange(datos.imagenComprobante);
              }
              setMostrarCapturaTarjeta(false);
            }}
          />
        </Card>
      )}

      {/* Captura para Transferencia (lógica existente) */}
      {metodoSeleccionado === 'TRANSFERENCIA' && (
        <Card className="p-4 space-y-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
            <Upload className="h-5 w-5" />
            <span>Comprobante de Transferencia</span>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => setMostrarModalTransferencia(true)}
          >
            <Upload className="h-4 w-4" />
            {imagenComprobante ? 'Cambiar Comprobante' : 'Adjuntar Comprobante'}
          </Button>
          
          {imagenComprobante && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="text-lg">✓</span> Comprobante adjuntado correctamente
            </p>
          )}

          {datosTransferencia?.aliasCbu && (
            <div className="text-xs space-y-1 pt-2 border-t">
              <p><strong>Alias/CBU:</strong> {datosTransferencia.aliasCbu}</p>
              {datosTransferencia.banco && <p><strong>Banco:</strong> {datosTransferencia.banco}</p>}
              {datosTransferencia.numeroOperacion && <p><strong>N° Operación:</strong> {datosTransferencia.numeroOperacion}</p>}
            </div>
          )}

          <ComprobanteTransferenciaModal
            open={mostrarModalTransferencia}
            onOpenChange={setMostrarModalTransferencia}
            esTarjeta={false}
            onConfirmar={(datos) => {
              onDatosTransferenciaChange?.(datos);
              if (datos.imagenComprobante) {
                onImagenChange(datos.imagenComprobante);
              }
              setMostrarModalTransferencia(false);
            }}
          />
        </Card>
      )}
    </div>
  );
}
