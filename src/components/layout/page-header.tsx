// src/components/layout/page-header.tsx
import type React from "react"
import { cn } from "@/lib/utils"

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: React.ReactNode // Allow string or other elements (like dates)
}

export function PageHeader({ title, subtitle, className, ...props }: Props) {
  return (
    <div className={cn(className)} {...props}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && ( // Only render subtitle if provided
        <p className="text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}