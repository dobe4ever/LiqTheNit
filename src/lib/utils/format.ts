// src/lib/utils/format.ts
// Consolidate formatters

export function formatMoney(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }
  
  export function formatUBTC(amount: number): string {
    // Format with comma separators for readability if large
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return `${formatted} µ`
  }
  
  export function convertUBTCtoUSD(uBTC: number, btcPriceUSD: number): number {
    if (!btcPriceUSD) return 0
    return (uBTC / 1_000_000) * btcPriceUSD
  }