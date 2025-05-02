// src/lib/utils/date.ts
// Consolidate date functions

export function formatDate(d: Date | string): string {
    const dt = typeof d === "string" ? new Date(d) : d
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  
  export function formatDateTime(d: Date | string): string {
    const dt = typeof d === "string" ? new Date(d) : d
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  
  export function getHoursDifference(start: Date | string, end: Date | string): number {
    const startDt = typeof start === "string" ? new Date(start) : start
    const endDt = typeof end === "string" ? new Date(end) : end
    const diffMs = Math.abs(endDt.getTime() - startDt.getTime())
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // hours with 2 decimals
  }
  
  export function getStartOfWeek(): Date {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }