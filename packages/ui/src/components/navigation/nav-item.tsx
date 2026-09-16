'use client';

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export interface NavItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  /**
   * Render `children` as the element (e.g. a router link) and apply the nav
   * styling and contents to it.
   */
  asChild?: boolean;
  children?: React.ReactNode;
}

/**
 * Icon-only navigation item for the rail.
 *
 * `asChild` used to be implemented with Radix `Slot`, but the component also
 * rendered its own icon as a sibling of the slot child. `Slot` replaces its
 * output with the single child element, so the icon and the active indicator
 * were dropped entirely — the rail rendered as a column of empty, invisible
 * click targets in the packaged app.
 *
 * The child element is now cloned explicitly with the styling merged on and the
 * icon injected as its content, which keeps the design system free of any
 * router dependency while actually rendering.
 */
export function NavItem({
  icon: Icon,
  label,
  isActive = false,
  asChild = false,
  className,
  children,
  ...props
}: NavItemProps) {
  const classes = cn(
    "p-3 rounded-lg transition-colors group relative flex items-center justify-center",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF9D]/60",
    isActive
      ? "bg-[#00FF9D]/10 text-[#00FF9D]"
      : "text-slate-400 hover:bg-white/5 hover:text-white",
    className
  );

  const contents = (
    <>
      <Icon size={20} aria-hidden="true" />
      {/* The rail is icon-only; without an accessible name every item is
          announced as an unlabeled control. `title` alone is not enough. */}
      <span className="sr-only">{label}</span>
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#00FF9D] rounded-r-full"
        />
      )}
    </>
  );

  const sharedProps = {
    className: classes,
    title: label,
    "aria-current": isActive ? ("page" as const) : undefined,
    "data-active": isActive || undefined,
  };

  if (asChild) {
    if (!React.isValidElement(children)) {
      // Fail loudly in development rather than rendering an empty control.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[NavItem] `asChild` requires a single valid React element child."
        );
      }
      return null;
    }

    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(
      child,
      {
        ...sharedProps,
        className: cn(classes, child.props.className),
      },
      contents
    );
  }

  return (
    <button type="button" {...sharedProps} {...props}>
      {contents}
    </button>
  );
}
