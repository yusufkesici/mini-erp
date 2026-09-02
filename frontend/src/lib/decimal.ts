export function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatQty(value: string | number | null | undefined): string {
  return parseDecimal(value).toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

export function formatMoney(value: string | number | null | undefined): string {
  return parseDecimal(value).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  });
}
