import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap rounded-md outline-none select-none transition-colors duration-[250ms] focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-cyan text-text-on-brand hover:bg-brand-cyan-bright active:bg-brand-cyan-dim",
        secondary:
          "border border-surface-border-strong bg-transparent text-text-primary hover:bg-surface-elevated active:bg-surface-raised",
        ghost:
          "bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary active:bg-surface-elevated",
      },
      size: {
        sm: "h-8 gap-2 px-3 text-sm [&>svg]:size-4",
        md: "h-10 gap-2 px-4 text-base [&>svg]:size-5",
        lg: "h-12 gap-2 px-6 text-lg [&>svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot.Root
          ref={ref}
          data-slot="button"
          data-variant={variant}
          data-size={size}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Slot.Root>
      )
    }

    const iconSizeClass =
      size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"

    return (
      <button
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={cn("animate-spin shrink-0", iconSizeClass)} />
            {children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0 flex items-center justify-center">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0 flex items-center justify-center">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
