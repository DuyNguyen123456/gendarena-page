import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lg bg-surface-overlay/80 motion-safe:animate-pulse border border-surface-border/40",
        className
      )}
      {...props}
    />
  )
}
