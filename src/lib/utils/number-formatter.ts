export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatUBTC(amount: number): string {
  return `${amount} µ`
}

export function convertUBTCtoUSD(uBTC: number, btcPriceInUSD: number): number {
  // Convert µBTC to BTC (1 µBTC = 0.000001 BTC)
  const btc = uBTC * 0.000001
  // Convert BTC to USD
  return btc * btcPriceInUSD
}