import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex items-center justify-center gap-1.5 rounded-[46px] px-3.5 py-1 text-xs font-bold tracking-[0.144px] whitespace-nowrap transition-colors outline-none select-none [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-transparent",
        secondary:
          "bg-black text-white dark:bg-white dark:text-black border border-transparent",
        outline:
          "border border-black bg-transparent text-foreground dark:border-white/40",
        hairline:
          "border border-neutral-200 bg-surface-soft text-foreground dark:border-white/16 dark:bg-surface-deep",
        ghost:
          "hover:bg-surface-soft text-foreground dark:hover:bg-surface-deep",
        destructive:
          "border border-destructive/50 bg-destructive/10 text-destructive",
        success:
          "border border-emerald-600/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning:
          "border border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
