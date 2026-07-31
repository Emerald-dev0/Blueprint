import * as React from "react"
import { cn } from "../../lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white ring-offset-background placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FF9D] disabled:cursor-not-allowed disabled:opacity-50 font-mono transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
