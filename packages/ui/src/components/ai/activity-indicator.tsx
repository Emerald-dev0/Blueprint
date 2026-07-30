import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

export interface ActivityIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function ActivityIndicator({ className, label, ...props }: ActivityIndicatorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)} {...props}>
      <div className="relative flex h-2 w-2">
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inline-flex h-full w-full rounded-full bg-[#00FF9D] opacity-75"
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00FF9D]" />
      </div>
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {label}
        </span>
      )}
    </div>
  )
}
