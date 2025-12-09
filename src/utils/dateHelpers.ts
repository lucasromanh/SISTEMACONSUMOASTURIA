/**
 * Obtiene la fecha de hoy en formato ISO (YYYY-MM-DD) usando hora local
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el inicio de la semana actual
 */
export function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
  return new Date(now.setDate(diff));
}

/**
 * Obtiene el fin de la semana actual
 */
export function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/**
 * Obtiene el inicio del mes actual
 */
export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Obtiene el fin del mes actual
 */
export function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * Convierte una fecha a formato ISO string (YYYY-MM-DD) usando hora local
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica si una fecha está entre dos fechas
 */
export function isBetweenDates(date: string, startDate: string, endDate: string): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return d >= start && d <= end;
}

/**
 * Obtiene el rango de fechas según el período
 */
export function getDateRangeByPeriod(period: 'day' | 'week' | 'month'): { start: string; end: string } {
  let start: string;
  let end: string;

  switch (period) {
    case 'day':
      // Usar getTodayISO() que maneja correctamente la zona horaria local
      start = getTodayISO();
      end = getTodayISO();
      break;
    case 'week':
      start = toISODate(getStartOfWeek());
      end = toISODate(getEndOfWeek());
      break;
    case 'month':
      start = toISODate(getStartOfMonth());
      end = toISODate(getEndOfMonth());
      break;
  }

  return { start, end };
}
