import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary-100 text-primary-800 border border-primary-200",
        secondary:
          "bg-neutral-100 text-neutral-600 border border-neutral-200",
        destructive:
          "bg-destructive-50 text-destructive-700 border border-destructive-200",
        success:
          "bg-success-50 text-success-700 border border-success-200",
        warning:
          "bg-warning-50 text-warning-700 border border-warning-200",
        outline:
          "text-neutral-600 border border-neutral-300 bg-transparent",
        // Status-specific variants
        normal:
          "bg-success-50 text-success-700 border border-success-200",
        adjustment:
          "bg-destructive-50 text-destructive-700 border border-destructive-200",
        pending:
          "bg-warning-50 text-warning-700 border border-warning-200",
        processing:
          "bg-blue-50 text-blue-700 border border-blue-200",
        failed:
          "bg-neutral-100 text-neutral-600 border border-neutral-300",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
