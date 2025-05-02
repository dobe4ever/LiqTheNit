export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - d.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function getHoursDifference(start: Date | string, end: Date | string): number {
  const startDate = typeof start === "string" ? new Date(start) : start
  const endDate = typeof end === "string" ? new Date(end) : end

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.round((diffTime / (1000 * 60 * 60)) * 100) / 100
}

export function getStartOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() || 7 // Convert Sunday from 0 to 7
  if (day !== 1) {
    // If it's not Monday
    now.setHours(-24 * (day - 1)) // Set to previous Monday
  }
  now.setHours(0, 0, 0, 0) // Set to start of day
  return now
}