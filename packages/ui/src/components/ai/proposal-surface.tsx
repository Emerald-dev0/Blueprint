import * as React from "react"
import { cn } from "../../lib/utils"

export interface AIProposalSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
}

const AIProposalSurface = React.forwardRef<HTMLDivElement, AIProposalSurfaceProps>(
  ({ className, isActive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-surface-2 transition-all duration-300",
          isActive
            ? "border-mint shadow-[0_0_20px_rgba(0,255,157,0.15)]"
            : "border-white/10 shadow-xl shadow-black/40",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AIProposalSurface.displayName = "AIProposalSurface"

export { AIProposalSurface }
