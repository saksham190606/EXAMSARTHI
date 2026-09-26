import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[2px] text-sm font-bold whitespace-nowrap outline-none select-none tracking-[0.144px] transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-muted disabled:text-stone-400 disabled:border-transparent disabled:opacity-70 disabled:active:scale-100 disabled:hover:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-transparent shadow-none hover:bg-primary-deep hover:shadow-[0_4px_12px_rgba(255,237,0,0.3)] active:bg-primary-deep focus-visible:ring-black dark:focus-visible:ring-primary",
        secondary:
          "bg-secondary text-secondary-foreground border border-transparent shadow-none hover:bg-[#222222] hover:shadow-[0_4px_12px_rgba(0,0,0,0.25)] active:bg-[#111111] dark:hover:bg-neutral-200 dark:hover:text-black dark:hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)]",
        outline:
          "border border-black bg-white text-black hover:bg-black hover:text-white dark:bg-black dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black shadow-none transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        ghost:
          "hover:bg-surface-soft hover:text-foreground dark:hover:bg-surface-deep text-foreground rounded-[2px]",
        destructive:
          "border border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive rounded-[2px]",
        link:
          "text-foreground underline underline-offset-4 hover:text-neutral-600 dark:hover:text-neutral-300 font-normal p-0 h-auto active:scale-100",
        pill:
          "rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black font-semibold text-[13px] tracking-[0.13px] px-4 py-2 shadow-none transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
      },
      size: {
        default: "h-12 min-h-[48px] px-6 py-3.5 text-[14.4px] leading-none",
        sm: "h-9 min-h-[36px] px-4 py-2 text-[13px] leading-none",
        xs: "h-8 min-h-[32px] px-3 py-1.5 text-xs leading-none",
        lg: "h-14 min-h-[56px] px-8 py-4 text-base leading-none",
        pill: "h-9 min-h-[36px] sm:min-h-[40px] px-4 py-2 text-[13px] leading-none",
        icon: "size-10 sm:size-11 min-w-[40px] min-h-[40px] p-0",
        "icon-sm": "size-8 min-w-[32px] min-h-[32px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // If render is a React element that is not a native 'button' (e.g. Next.js <Link> or <a>),
  // Base UI requires nativeButton={false} to avoid warnings and maintain valid accessibility semantics.
  const isNonButtonElement = render && React.isValidElement(render) && render.type !== "button";
  const resolvedNativeButton = nativeButton ?? (isNonButtonElement ? false : undefined);

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={resolvedNativeButton}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
