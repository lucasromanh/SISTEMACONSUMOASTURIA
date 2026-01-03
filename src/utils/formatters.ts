/**
 * Formatea un número como moneda argentina (ARS)
 * ✅ Maneja valores undefined, null y NaN de forma segura
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  // Convertir a número de forma segura
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Validar que sea un número válido
  if (numValue === undefined || numValue === null || isNaN(numValue)) {
    return '$ 0,00';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Formatea una fecha ISO a formato legible
 */
export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);

  if (format === 'short') {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formatea una fecha y hora ISO
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatea un número con separador de miles
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num);
}
