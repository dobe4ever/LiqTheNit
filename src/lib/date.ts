// src/lib/date.ts
// Format date: Jan 1, 2024
export function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Format date & time: Jan 1, 2024, 09:30 AM
export function fmtDt(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true
  })
}

// Format time: 09:30 AM
export function fmtTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) // Use numeric hour
}

// Format date: M/D/YYYY
export function fmtDateShort(d: Date | string): string {
    const dt = typeof d === "string" ? new Date(d) : d
    return dt.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
}

// Format duration in minutes or hours+minutes
export function fmtDurMins(start: Date | string, end: Date | string): string {
  const startDt = typeof start === "string" ? new Date(start) : start
  const endDt = typeof end === "string" ? new Date(end) : end
  const diffMs = Math.abs(endDt.getTime() - startDt.getTime())
  const totalMins = Math.round(diffMs / (1000 * 60))

  if (totalMins < 60) {
    return `${totalMins}m`
  } else {
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return `${hours}h ${mins}m`
  }
}

// Get hours difference between two dates
export function hrsDiff(start: Date | string, end: Date | string): number {
  const startDt = typeof start === "string" ? new Date(start) : start
  const endDt = typeof end === "string" ? new Date(end) : end
  const diffMs = Math.abs(endDt.getTime() - startDt.getTime())
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Round to 2 decimals
}

// Get start of the current week (Monday)
export function startOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, ...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0) // Set to start of day
  return monday
}