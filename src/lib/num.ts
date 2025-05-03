// Format currency: $1,234.56
export function fmtMoney(amt: number, cur = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: cur,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amt)
}

// Format micro-BTC: 100 µ
export function fmtUBtc(amt: number): string {
  // Handle potential NaN or null inputs gracefully
  if (isNaN(amt) || amt === null) return "0 µ"
  return `${amt} µ`
}

// Convert micro-BTC to USD
export function uBtcToUsd(uBtc: number, btcPrice: number): number {
  // Handle potential NaN or null inputs
  if (isNaN(uBtc) || uBtc === null || isNaN(btcPrice) || btcPrice === null || btcPrice === 0) return 0
  const btc = uBtc * 0.000001
  return btc * btcPrice
}