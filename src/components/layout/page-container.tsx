// src/components/layout/page-container.tsx
import type React from "react"
import { cn } from "@/lib/utils"

// 1. Define what props the component accepts
interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode // It must accept 'children'
}

// 2. The component function
export function PageContainer({ children, className, ...props }: Props) {
  // children: Whatever you put INSIDE <PageContainer>...</PageContainer>
  // className: Optional extra CSS classes passed from outside (like <PageContainer className="pt-10">)
  // ...props: Any other standard HTML attributes (like id="my-id", style={{...}}, etc.)

  return (
    // 3. The actual HTML element (a div)
    <div
      // 4. Apply classes:
      //    - Default classes ("flex w-full...")
      //    - Temporary visual aid classes ("border-2...")
      //    - Any extra 'className' passed from outside
      className={cn(
        "flex w-full min-h-screen flex-col gap-6 p-6 pb-20 justify-center",
        className // Extra classes from outside
      )}
      // 5. Apply any other standard HTML attributes passed in via ...props
      {...props}
    >
      {/* 6. Render the content passed inside the tags */}
      {children}
    </div>
  )
}