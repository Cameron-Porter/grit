type CellValue = string | number | boolean | null | undefined;

function cell(value: CellValue): string {
  if (value == null) return '';
  const str = String(value);
  return /[,"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCSV(headers: string[], rows: CellValue[][]): string {
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  return lines.join('\n');
}
