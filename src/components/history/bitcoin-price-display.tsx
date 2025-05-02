"use client"

import { useEffect, useState } from "react"
import { formatMoney } from "@/lib/utils/number-formatter"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"

export function BitcoinPriceDisplay() {
  const [price, setPrice] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchPrice = async () => {
      setLoading(true)
      try {
        const btcPrice = await getBitcoinPriceInUSD()
        setPrice(btcPrice)
      } catch (error) {
        console.error("Error fetching Bitcoin price:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-md h-6 w-32"></div>
  }

  return (
    <div className="flex items-center gap-2 font-medium">
      <div className="flex items-center">
        <span className="text-yellow-500 mr-1">₿</span>
        <span>{formatMoney(price)}</span>
      </div>
    </div>
  )
}