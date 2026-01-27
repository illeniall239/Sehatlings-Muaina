import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - Taller, more refined
          "flex h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-neutral-800",
          // Border - Subtle
          "border-neutral-200",
          // Focus - Refined glow effect
          "focus:border-primary-800/30 focus:ring-4 focus:ring-primary-800/5",
          // Transitions
          "transition-all duration-200 ease-out",
          // Placeholder
          "placeholder:text-neutral-400",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary-800 file:mr-3",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
          // Focus visible
          "focus-visible:outline-none",
          // Hover
          "hover:border-neutral-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
