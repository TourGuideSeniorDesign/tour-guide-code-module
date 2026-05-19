import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--color-primary) text-(--color-primary-foreground)",
        secondary:
          "border-transparent bg-(--color-secondary) text-(--color-secondary-foreground)",
        destructive:
          "border-transparent bg-(--color-destructive) text-(--color-destructive-foreground)",
        outline: "border-(--color-border) text-(--color-foreground)",
        success: "border-transparent bg-emerald-500/15 text-emerald-700",
        warning: "border-transparent bg-amber-500/15 text-amber-700",
        error: "border-transparent bg-red-500/15 text-red-700",
        info: "border-transparent bg-blue-500/15 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
