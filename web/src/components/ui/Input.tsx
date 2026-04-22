import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-bold text-muted-foreground/80">{label}</label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-[#B8924A] transition-colors">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/30",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B8924A]/50 focus-visible:border-[#B8924A]/50",
              "disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              icon && "pl-12",
              error && "border-red-500/40 ring-1 ring-red-500/25",
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-semibold text-red-400 mt-1">{error}</p>
        )}
      </div>
    )
  },
)
Input.displayName = "Input"

export { Input }
