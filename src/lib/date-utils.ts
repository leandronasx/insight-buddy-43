export function getDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endM = month === 12 ? 1 : month + 1;
  const endY = month === 12 ? year + 1 : year;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;
  return { start, end };
}

export function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
