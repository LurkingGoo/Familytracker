import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-neutral-750 bg-neutral-900 px-3.5 py-2 text-base text-white transition-all outline-none placeholder:text-neutral-500 hover:border-neutral-500 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
