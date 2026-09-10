export function formatCoins(coins: number): string {
  if (isNaN(coins) || coins === undefined || coins === null) return '0';
  const val = Math.round(coins * 100) / 100;
  if (Number.isInteger(val)) {
    return val.toString();
  }
  return val.toFixed(2).replace(/\.?0+$/, '');
}
