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

export function NavItem({
  icon: Icon,
  label,
  isActive,
  asChild,
  className,
  children,
  ...props
}: NavItemProps) {
  const Comp = asChild ? Slot : "button"

  const content = (
    <>
      <Icon size={20} aria-hidden="true" />
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#00FF9D] rounded-r-full" />
      )}
    </>
  )

  // With `asChild` the caller supplies the element to render (e.g. a Link).
  // Slot merges our props onto that element but does not give it content, so
  // the icon has to be injected as its children — otherwise the rail renders
  // a column of empty boxes.
  const slotted =
    asChild && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement, undefined, content)
      : content

  return (
    <Comp
      className={cn(
        "p-3 rounded-lg transition-colors group relative flex items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF9D]/60",
        isActive
          ? "bg-[#00FF9D]/10 text-[#00FF9D]"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
        className
      )}
      title={label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      {...props}
    >
      {slotted}
    </Comp>
  )
}
