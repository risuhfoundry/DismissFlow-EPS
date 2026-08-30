import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

/**
 * Link styled as a DismissFlow button. Used for navigation CTAs on the public
 * site so links share the exact button language without a client wrapper.
 * Server-compatible (no hooks).
 */
type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 select-none font-medium " +
  "rounded-md transition-colors duration-150 ease-standard outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-secondary text-secondary-foreground hover:bg-border/70 border border-border",
  outline: "bg-transparent text-foreground border border-border hover:bg-muted",
  ghost: "bg-transparent text-secondary-foreground hover:bg-muted"
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={clsx(BASE, SIZES[size], VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
