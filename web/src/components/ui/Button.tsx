import * as React from "react"
import { cn } from "@/lib/utils"

const buttonVariants = {
  variant: {
    default:
      "bg-muted border border-border text-foreground hover:bg-muted/80 hover:border-border/80",
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 border border-border/10",
    destructive:
      "bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25",
    outline:
      "border border-border bg-transparent hover:bg-muted text-foreground",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    ghost: "hover:bg-muted text-foreground",
    link:  "text-[#B8924A] underline-offset-4 hover:underline",
    gold:
      "bg-[#B8924A] text-white hover:bg-[#c9a059] shadow-lg shadow-[#B8924A]/20 border border-[#B8924A]/30",
    "gold-outline":
      "border border-[#B8924A]/30 text-[#B8924A] bg-[#B8924A]/[0.06] hover:bg-[#B8924A]/[0.12] hover:border-[#B8924A]/60",
    glow:
      "bg-[#B8924A] text-white shadow-[0_0_20px_rgba(184,146,74,0.4)] hover:shadow-[0_0_32px_rgba(184,146,74,0.65)] hover:bg-[#c9a059] border border-[#B8924A]/40 transition-shadow",
    uber:
      "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-black border border-border/10",
  },
  size: {
    default: "h-11 px-6 py-2",
    sm:      "h-8 rounded-md px-3 text-xs",
    lg:      "h-13 rounded-xl px-10 text-base",
    xl:      "h-16 rounded-2xl px-12 text-lg",
    icon:    "h-10 w-10 p-0",
  },
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  fullWidth?: boolean
  isLoading?: boolean
  href?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", fullWidth, isLoading, children, href, ...props },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8924A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]"
    const variantClasses = buttonVariants.variant[variant]
    const sizeClasses    = buttonVariants.size[size]
    const widthClass     = fullWidth ? "w-full" : ""

    const combined = cn(baseClasses, variantClasses, sizeClasses, widthClass, className)

    if (href) {
      return (
        <a
          href={href}
          className={combined}
          onClick={(e) => { if (props.disabled || isLoading) e.preventDefault() }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Aguarde...
            </span>
          ) : children}
        </a>
      )
    }

    return (
      <button
        className={combined}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Aguarde...
          </span>
        ) : children}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button }
