"use server"
// Fetch BTC price from CoinGecko
export async function getBtcUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { next: { revalidate: 300 } } // Cache 5 min
    )
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    const data = await res.json()
    return data?.bitcoin?.usd ?? 0
  } catch (error: any) {
    console.error("BTC Price Error:", error.message)
    return 0 // Fallback
  }
}