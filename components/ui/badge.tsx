import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center font-medium whitespace-nowrap rounded-full transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-elevated text-text-secondary",
        success: "bg-semantic-success/15 text-semantic-success",
        warning: "bg-semantic-warning/15 text-semantic-warning",
        danger: "bg-semantic-danger/15 text-semantic-danger",
        info: "bg-semantic-info/15 text-semantic-info",
        brand: "bg-brand-cyan/15 text-brand-cyan",
      },
      size: {
        sm: "h-5 px-2 text-xs gap-1 [&>svg]:size-3",
        md: "h-6 px-2.5 text-sm gap-1.5 [&>svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "span"

    return (
      <Comp
        ref={ref}
        data-slot="badge"
        data-variant={variant}
        data-size={size}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export { Badge, badgeVariants }
