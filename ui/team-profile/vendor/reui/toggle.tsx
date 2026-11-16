"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cn } from "cn"

function Toggle({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-pressed:border-border data-pressed:bg-muted data-pressed:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

export { Toggle }
