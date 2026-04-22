import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default:     "bg-white/[0.08] text-white/70 border-white/[0.10]",
  secondary:   "bg-white/[0.04] text-white/50 border-white/[0.07]",
  destructive: "bg-red-500/15 text-red-400 border-red-500/20",
  outline:     "text-foreground border-white/[0.10]",
  primary:     "bg-[#B8924A]/10 text-[#B8924A] border-[#B8924A]/20",
  gold:        "bg-[#B8924A]/10 text-[#B8924A] border-[#B8924A]/25 shadow-sm shadow-[#B8924A]/10",
  success:     "bg-green-500/10 text-green-400 border-green-500/20",
  warning:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error:       "bg-red-500/10 text-red-400 border-red-500/20",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-[#B8924A] focus:ring-offset-2",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
