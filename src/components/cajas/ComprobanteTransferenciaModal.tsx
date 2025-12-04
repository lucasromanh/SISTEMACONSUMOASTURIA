import { useState, useRef } from 'react';
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
import { Camera, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createWorker } from 'tesseract.js';

interface DatosTransferencia {
  monto: string;
  hora: string;
  aliasCbu: string;
  banco: string;
  numeroOperacion: string;
}

interface ComprobanteTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (datos: DatosTransferencia) => void;
}

export function ComprobanteTransferenciaModal({
  open,
  onOpenChange,
  onConfirmar,
}: ComprobanteTransferenciaModalProps) {
  const [procesando, setProcesando] = useState(false);
  const [imagenCapturada, setImagenCapturada] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(false); // Nuevo estado para carga manual
  const [datosDetectados, setDatosDetectados] = useState<DatosTransferencia>({
    monto: '',
    hora: '',
    aliasCbu: '',
    banco: '',
    numeroOperacion: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Preprocesar imagen para mejorar OCR
  const preprocesarImagen = (imagenUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Crear canvas para procesamiento
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imagenUrl);
          return;
        }

        // Establecer tamaño del canvas
        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar imagen original
        ctx.drawImage(img, 0, 0);

        // Obtener datos de píxeles
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 1. Convertir a escala de grises y aumentar contraste
        for (let i = 0; i < data.length; i += 4) {
          // Convertir a escala de grises usando luminosidad
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Aumentar contraste (factor 1.5)
          let adjusted = ((gray - 128) * 1.5) + 128;
          adjusted = Math.max(0, Math.min(255, adjusted));

          data[i] = adjusted;     // R
          data[i + 1] = adjusted; // G
          data[i + 2] = adjusted; // B
        }

        // 2. Aplicar binarización adaptativa (Otsu's method simplificado)
        // Calcular histograma
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          histogram[data[i]]++;
        }

        // Calcular threshold óptimo
        const total = canvas.width * canvas.height;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;

        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;

          wF = total - wB;
          if (wF === 0) break;

          sumB += t * histogram[t];

          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;

          const variance = wB * wF * (mB - mF) * (mB - mF);

          if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
          }
        }

        // Aplicar threshold
        for (let i = 0; i < data.length; i += 4) {
          const value = data[i] > threshold ? 255 : 0;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }

        // 3. Reducción de ruido (median filter simplificado)
        const tempData = new Uint8ClampedArray(data);
        const width = canvas.width;
        const height = canvas.height;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            // Obtener vecinos 3x3
            const neighbors = [];
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                neighbors.push(tempData[nIdx]);
              }
            }

            // Calcular mediana
            neighbors.sort((a, b) => a - b);
            const median = neighbors[4]; // Elemento del medio en array de 9

            data[idx] = median;
            data[idx + 1] = median;
            data[idx + 2] = median;
          }
        }

        // Aplicar imagen procesada al canvas
        ctx.putImageData(imageData, 0, 0);

        // Convertir a base64
        const processedImage = canvas.toDataURL('image/png');
        resolve(processedImage);
      };
      img.src = imagenUrl;
    });
  };

  // Procesar imagen con OCR
  const procesarImagen = async (imagenUrl: string) => {
    setProcesando(true);

    try {
      toast({
        title: '🔍 Procesando comprobante...',
        description: 'Mejorando imagen y detectando información',
      });

      // Preprocesar imagen para mejorar OCR
      const imagenPreprocesada = await preprocesarImagen(imagenUrl);

      // Configurar Tesseract con parámetros optimizados
      const worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Primera pasada con imagen preprocesada y PSM 6
      console.log('Intentando OCR con imagen preprocesada (PSM 6)...');
      let result = await worker.recognize(imagenPreprocesada, {
        rotateAuto: true,
      });
      let textoDetectado = result.data.text;

      // Si no se detectó suficiente texto, intentar con imagen original
      if (textoDetectado.length < 20) {
        console.log('Poco texto detectado, intentando con imagen original...');
        result = await worker.recognize(imagenUrl, {
          rotateAuto: true,
        });
        textoDetectado = result.data.text;
      }

      // Si aún no hay suficiente texto, intentar con más configuraciones
      if (textoDetectado.length < 20) {
        console.log('Intentando con configuración alternativa...');
        result = await worker.recognize(imagenPreprocesada, {
          rotateAuto: true,
        });
        textoDetectado = result.data.text;
      }

      await worker.terminate();

      console.log('Texto detectado por OCR:', textoDetectado);

      // Extraer información del texto detectado
      const datos = extraerDatosDeTexto(textoDetectado);
      setDatosDetectados(datos);

      toast({
        title: '✅ Comprobante procesado',
        description: 'Verifica que los datos sean correctos',
      });
    } catch (error) {
      console.error('Error en OCR:', error);
      toast({
        variant: 'destructive',
        title: '❌ Error al procesar',
        description: 'Verifica la imagen y completa los datos manualmente',
      });
    } finally {
      setProcesando(false);
    }
  };

  // Extraer datos del texto reconocido
  const extraerDatosDeTexto = (texto: string): DatosTransferencia => {
    const datos: DatosTransferencia = {
      monto: '',
      hora: '',
      aliasCbu: '',
      banco: '',
      numeroOperacion: '',
    };

    // Normalizar texto
    const lineas = texto.split('\n').map(l => l.toLowerCase().trim());

    // Detectar banco ORIGEN (quien envía el dinero)
    // Buscar después de "Banco:" o en contexto de "origen", "de", "desde"
    const bancosMap: Record<string, string> = {
      'bna': 'BNA+',
      'bna+': 'BNA+',
      'banco nacion': 'Banco Nación',
      'banco de la nacion': 'Banco Nación',
      'nacion': 'Banco Nación',
      'naranja': 'Naranja X',
      'naranja x': 'Naranja X',
      'mercado pago': 'Mercado Pago',
      'mercadopago': 'Mercado Pago',
      'macro': 'Banco Macro',
      'galicia': 'Banco Galicia',
      'santander': 'Santander',
      'bbva': 'BBVA',
      'icbc': 'ICBC',
      'supervielle': 'Supervielle',
      'patagonia': 'Patagonia',
      'hipotecario': 'Hipotecario',
      'ciudad': 'Ciudad',
      'provincia': 'Provincia',
      'comafi': 'Comafi',
      'credicoop': 'Credicoop',
      'industrial': 'Industrial',
      'itau': 'Itaú',
      'hsbc': 'HSBC',
      'brubank': 'Brubank',
      'uala': 'Ualá',
      'prex': 'Prex',
      'personal pay': 'Personal Pay',
    };

    // Buscar Banco ORIGEN
    // El OCR puede no detectar logos, así que buscamos en el texto
    // Si encuentra "Banco:" con un valor, ese es el DESTINO, no el origen
    // El origen debe ser ingresado manualmente si no aparece en el texto

    let bancoEncontrado = '';
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];

      // Si encuentra una línea que dice "Banco: XXXX", ese es el DESTINO
      if (linea.startsWith('banco:')) {
        // Línea con banco destino detectada; no usar como banco origen
        continue;
      }

      // Buscar menciones de bancos en otras partes (puede ser el origen)
      for (const [key, value] of Object.entries(bancosMap)) {
        if (linea.includes(key) && !linea.includes('banco:')) {
          bancoEncontrado = value;
          break;
        }
      }
      if (bancoEncontrado) break;
    }

    // Dejar vacío si no se encontró para que el usuario lo complete manualmente
    datos.banco = bancoEncontrado;

    // Detectar monto
    // NOTA: Mercado Pago muestra el monto en tipografía muy grande que el OCR no siempre detecta
    // En esos casos el campo quedará vacío para completar manualmente
    let montoEncontrado = false;

    // Buscar después de "Importe:" o "Monto:"
    if (!montoEncontrado) {
      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        if (linea.includes('importe:') || linea.includes('monto:')) {
          const textoMonto = linea + ' ' + (lineas[i + 1] || '');
          const matchMonto = textoMonto.match(/([\d.,]+)/);
          if (matchMonto) {
            let montoStr = matchMonto[1];
            montoStr = montoStr.replace(/\./g, '').replace(',', '.');
            const numLimpio = montoStr.replace('.', '');
            if (numLimpio.length >= 4 && numLimpio.length <= 10) {
              datos.monto = montoStr;
              montoEncontrado = true;
              break;
            }
          }
        }
      }
    }

    // Buscar $ o 's' (OCR confunde $ con s) seguido de número
    if (!montoEncontrado) {
      const matchDolar = texto.match(/[\$s]\s*([\d.,]+)/);
      if (matchDolar) {
        let montoStr = matchDolar[1];
        montoStr = montoStr.replace(/\./g, '').replace(',', '.');
        const numLimpio = montoStr.replace('.', '');
        if (numLimpio.length >= 1 && numLimpio.length <= 10) {
          datos.monto = montoStr;
          montoEncontrado = true;
        }
      }
    }

    // Fallback: números de 4-8 dígitos (excluir CUIT formato XX-XXXXXXXX-X)
    if (!montoEncontrado) {
      const todosNumeros = texto.match(/\b(\d{4,8})\b/g);
      if (todosNumeros && todosNumeros.length > 0) {
        for (const num of todosNumeros) {
          // Excluir años (2025, 2024, etc) y números de CUIT (8 dígitos seguidos)
          // Verificar que no esté rodeado de guiones (formato CUIT)
          const contexto = texto.substring(texto.indexOf(num) - 5, texto.indexOf(num) + num.length + 5);
          const esCuit = contexto.includes('-') && num.length === 8;

          if (!num.startsWith('20') && !esCuit) {
            datos.monto = num;
            montoEncontrado = true;
            break;
          }
        }
      }
    }

    // Detectar hora (varios formatos)
    const regexHoras = [
      /(\d{1,2}:\d{2}:\d{2})/,           // HH:MM:SS
      /(\d{1,2}:\d{2})\s*(?:hs|hrs)?/,   // HH:MM
      /(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/, // fecha completa
    ];

    for (const regex of regexHoras) {
      const match = texto.match(regex);
      if (match) {
        // Extraer solo la hora si viene con fecha
        const horaMatch = match[1].match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (horaMatch) {
          datos.hora = horaMatch[1];
          break;
        }
      }
    }

    // Detectar número de operación
    let operacionEncontrada = false;

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];

      // Naranja X: "Código de transacción" (UUID) - ya está en minúsculas
      if (linea.includes('codigo de transaccion') || linea.includes('código de transacción')) {
        const siguiente = lineas[i + 1] || '';
        // UUID formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const matchUuid = siguiente.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        if (matchUuid) {
          datos.numeroOperacion = matchUuid[1];
          operacionEncontrada = true;
          break;
        }
      }

      // Mercado Pago: "Número de operación de Mercado Pago"
      if (linea.includes('operacion') && linea.includes('mercado pago')) {
        const siguiente = lineas[i + 1] || '';
        const matchNum = siguiente.match(/(\d+)/);
        if (matchNum) {
          datos.numeroOperacion = matchNum[1];
          operacionEncontrada = true;
          break;
        }
      }

      // Otros bancos: "N° de Operación" o "n* de operación"
      if (linea.includes('operacion') &&
        !linea.includes('mercado pago') &&
        !linea.includes('transaccion')) {
        // El número puede estar en la misma línea o en la siguiente
        const textoOperacion = linea + ' ' + (lineas[i + 1] || '');
        const matchNum = textoOperacion.match(/(\d{10,})/);
        if (matchNum) {
          datos.numeroOperacion = matchNum[1];
          operacionEncontrada = true;
          break;
        }
      }
    }

    // Fallback: número de 11-16 dígitos (excluyendo CBU de 22)
    if (!operacionEncontrada) {
      const numeros = texto.match(/\b(\d{11,16})\b/g);
      if (numeros && numeros.length > 0) {
        datos.numeroOperacion = numeros[0];
      }
    }

    // Detectar Alias/CBU destino (a donde enviamos el dinero)
    // Buscar específicamente "Alias Destino:" o "CBU/CVU Destino:"
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];

      // Buscar "Alias Destino:" o similar
      if (linea.includes('alias') && linea.includes('destino')) {
        // El alias está en la siguiente línea o después de ":"
        const contenido = linea.split(':')[1]?.trim() || lineas[i + 1] || '';
        // Extraer alias (letras, números, puntos, guiones)
        const matchAlias = contenido.match(/([a-zA-Z0-9.\-_]+)/);
        if (matchAlias && matchAlias[1] !== 'destino') {
          datos.aliasCbu = matchAlias[1];
          break;
        }
      }

      // Buscar "CBU/CVU Destino:" o similar
      if ((linea.includes('cbu') || linea.includes('cvu')) && linea.includes('destino')) {
        // Buscar 22 dígitos en esta línea o la siguiente
        const contenido = linea + ' ' + (lineas[i + 1] || '');
        const matchCBU = contenido.match(/(\d{22})/);
        if (matchCBU) {
          datos.aliasCbu = matchCBU[1];
          break;
        }
      }
    }

    // Fallback: buscar primer alias (palabra alfanumérica) o CBU de 22 dígitos
    if (!datos.aliasCbu) {
      // Buscar 22 dígitos
      const matchCBU = texto.match(/(\d{22})/);
      if (matchCBU) {
        datos.aliasCbu = matchCBU[1];
      } else {
        // Buscar alias común (después de "alias:" en cualquier parte)
        const matchAlias = texto.match(/alias[:\s]+([a-zA-Z0-9.\-_]{4,})/i);
        if (matchAlias) {
          datos.aliasCbu = matchAlias[1];
        }
      }
    }

    return datos;
  };

  // Capturar desde cámara
  const handleCapturarFoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // Subir imagen existente
  const handleSubirImagen = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  // Procesar archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: '❌ Archivo inválido',
        description: 'Solo se permiten imágenes',
      });
      return;
    }

    // Leer imagen
    const reader = new FileReader();
    reader.onload = (event) => {
      const imagenUrl = event.target?.result as string;
      setImagenCapturada(imagenUrl);

      // Solo procesar con OCR si NO está en modo manual
      if (!modoManual) {
        procesarImagen(imagenUrl);
      } else {
        toast({
          title: '📸 Imagen cargada',
          description: 'Complete los datos manualmente',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Confirmar y enviar datos
  const handleConfirmar = () => {
    // Validar campos obligatorios
    if (!datosDetectados.monto || !datosDetectados.numeroOperacion) {
      toast({
        variant: 'destructive',
        title: '❌ Datos incompletos',
        description: 'El monto y número de operación son obligatorios',
      });
      return;
    }

    // Incluir la imagen del comprobante en los datos
    const datosCompletos = {
      ...datosDetectados,
      imagenComprobante: imagenCapturada, // Base64 de la imagen
    };

    onConfirmar(datosCompletos);
    handleCerrar();
  };

  // Limpiar y cerrar
  const handleCerrar = () => {
    setImagenCapturada(null);
    setDatosDetectados({
      monto: '',
      hora: '',
      aliasCbu: '',
      banco: '',
      numeroOperacion: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📸 Registrar Transferencia</DialogTitle>
          <DialogDescription>
            Saca una foto del comprobante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle entre modo OCR y modo manual */}
          {!imagenCapturada && (
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Button
                type="button"
                variant={!modoManual ? "default" : "outline"}
                className="flex-1 h-10 text-sm"
                onClick={() => setModoManual(false)}
              >
                🤖 OCR Automático
              </Button>
              <Button
                type="button"
                variant={modoManual ? "default" : "outline"}
                className="flex-1 h-10 text-sm"
                onClick={() => setModoManual(true)}
              >
                ✍️ Carga Manual
              </Button>
            </div>
          )}

          {/* Botones de captura */}
          {!imagenCapturada && (
            <>
              {modoManual && (
                <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-400">Modo Manual Activado</p>
                  <p className="text-xs mt-1">Sube la foto y completa los datos manualmente. El OCR no se ejecutará.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="flex-1 h-12 gap-2"
                  onClick={handleCapturarFoto}
                >
                  <Camera className="h-4 w-4" />
                  Tomar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 gap-2"
                  onClick={handleSubirImagen}
                >
                  <Upload className="h-4 w-4" />
                  Subir
                </Button>
              </div>
            </>
          )}

          {/* Input oculto para archivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Vista previa de imagen */}
          {imagenCapturada && (
            <div className="relative border-2 border-dashed rounded-lg p-2">
              <img
                src={imagenCapturada}
                alt="Comprobante"
                className="w-full h-auto max-h-48 object-contain rounded"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-3 right-3 h-7 w-7"
                onClick={() => {
                  setImagenCapturada(null);
                  setDatosDetectados({
                    monto: '',
                    hora: '',
                    aliasCbu: '',
                    banco: '',
                    numeroOperacion: '',
                  });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Indicador de procesamiento */}
          {procesando && (
            <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Procesando comprobante con OCR...
              </span>
            </div>
          )}

          {/* Formulario con datos detectados */}
          {imagenCapturada && !procesando && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Datos detectados - Verifica y ajusta si es necesario</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="monto" className="text-sm font-semibold text-red-600">
                    Monto *
                  </Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={datosDetectados.monto}
                    onChange={(e) =>
                      setDatosDetectados({ ...datosDetectados, monto: e.target.value })
                    }
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numeroOperacion" className="text-sm font-semibold text-red-600">
                    Nº de Operación *
                  </Label>
                  <Input
                    id="numeroOperacion"
                    placeholder="123456789"
                    value={datosDetectados.numeroOperacion}
                    onChange={(e) =>
                      setDatosDetectados({ ...datosDetectados, numeroOperacion: e.target.value })
                    }
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="banco" className="text-sm">Banco Origen</Label>
                  <select
                    id="banco"
                    value={datosDetectados.banco}
                    onChange={(e) =>
                      setDatosDetectados({ ...datosDetectados, banco: e.target.value })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    size={1}
                  >
                    <option value="">Selecciona...</option>
                    <option value="Banco Macro">Macro</option>
                    <option value="Naranja X">Naranja X</option>
                    <option value="BNA+">BNA+</option>
                    <option value="Banco Galicia">Galicia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Santander">Santander</option>
                    <option value="BBVA">BBVA</option>
                    <option value="Brubank">Brubank</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="hora" className="text-sm">Hora</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={datosDetectados.hora}
                      onChange={(e) =>
                        setDatosDetectados({ ...datosDetectados, hora: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aliasCbu" className="text-sm">Alias/CBU</Label>
                    <Input
                      id="aliasCbu"
                      placeholder="alias.ejemplo"
                      value={datosDetectados.aliasCbu}
                      onChange={(e) =>
                        setDatosDetectados({ ...datosDetectados, aliasCbu: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={!imagenCapturada || procesando || !datosDetectados.monto || !datosDetectados.numeroOperacion}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
