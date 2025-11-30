/**
 * Convierte un array de objetos a formato CSV y descarga el archivo
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }

  // Si no se proporcionan headers, usar las claves del primer objeto
  const csvHeaders = headers
    ? headers
    : (Object.keys(data[0]) as Array<keyof T>).map((key) => ({
        key,
        label: String(key),
      }));

  // Crear la fila de encabezados
  const headerRow = csvHeaders.map((h) => `"${h.label}"`).join(',');

  // Crear las filas de datos
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((h) => {
        const value = row[h.key];
        // Escapar comillas dobles y envolver en comillas
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        return `"${stringValue.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Combinar todo
  const csv = [headerRow, ...dataRows].join('\n');

  // Crear un blob y descargarlo
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // \ufeff es BOM para UTF-8
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
