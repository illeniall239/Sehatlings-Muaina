import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-800/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary-800 text-white shadow-md shadow-primary-800/15 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-800/20 hover:-translate-y-0.5",
        destructive:
          "bg-destructive-600 text-white shadow-md shadow-destructive-600/15 hover:bg-destructive-500 hover:shadow-lg hover:-translate-y-0.5",
        outline:
          "border-2 border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900",
        secondary:
          "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200/80",
        ghost:
          "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        link:
          "text-primary-800 underline-offset-4 hover:underline hover:text-primary-700",
        premium:
          "bg-gradient-to-r from-primary-800 to-primary-700 text-white shadow-lg shadow-primary-800/20 hover:from-primary-700 hover:to-primary-600 hover:shadow-xl hover:shadow-primary-800/25 hover:-translate-y-0.5",
        success:
          "bg-success-600 text-white shadow-md shadow-success-600/15 hover:bg-success-500 hover:shadow-lg hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-6 py-3",
        xl: "h-14 px-8 py-4 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
