import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2 uppercase tracking-tighter",
  {
    variants: {
      variant: {
        default: "border-transparent bg-surface-2 text-slate-400",
        primary: "border-transparent bg-mint/10 text-mint",
        success: "border-transparent bg-emerald-500/10 text-emerald-500",
        warning: "border-transparent bg-amber-500/10 text-amber-500",
        error: "border-transparent bg-red-500/10 text-red-500",
        outline: "text-slate-500 border-white/5 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
