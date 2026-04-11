export function downloadCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell ?? ''}"`).join(';')),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
