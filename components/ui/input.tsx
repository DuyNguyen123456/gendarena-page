import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  error?: boolean | string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    const isError = Boolean(error)
    const errorMessage = typeof error === "string" ? error : undefined

    const inputElement = (
      <div className="relative w-full">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary [&>svg]:size-4">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          disabled={disabled}
          ref={ref}
          data-slot="input"
          data-error={isError ? "true" : undefined}
          className={cn(
            "h-10 w-full rounded-md border bg-surface-raised px-3 text-base text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-[150ms]",
            "focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            isError
              ? "border-semantic-danger focus:border-semantic-danger focus:ring-semantic-danger/20"
              : "border-surface-border",
            disabled && "cursor-not-allowed bg-surface-base opacity-50",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary [&>svg]:size-4">
            {rightIcon}
          </div>
        )}
      </div>
    )

    if (errorMessage) {
      return (
        <div className="w-full">
          {inputElement}
          <p className="mt-1.5 text-sm text-semantic-danger">{errorMessage}</p>
        </div>
      )
    }

    return inputElement
  }
)

Input.displayName = "Input"

export { Input }
