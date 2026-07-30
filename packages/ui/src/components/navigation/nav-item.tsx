import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  asChild?: boolean;
}

export function NavItem({ icon: Icon, label, isActive, asChild, className, ...props }: NavItemProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(
        "p-3 rounded-lg transition-colors group relative flex items-center justify-center",
        isActive
          ? "bg-[#00FF9D]/10 text-[#00FF9D]"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
        className
      )}
      title={label}
      {...props}
    >
      {asChild ? props.children : (
        <>
          <Icon size={20} />
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#00FF9D] rounded-r-full" />
          )}
        </>
      )}
    </Comp>
  )
}
