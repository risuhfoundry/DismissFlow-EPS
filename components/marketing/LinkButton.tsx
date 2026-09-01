import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonVariant,
  type ButtonSize
} from "@/components/ui/buttonStyles";

/**
 * Link styled as a DismissFlow button. Used for navigation CTAs on the public
 * site so links share the exact button language without a client wrapper.
 * Server-compatible (no hooks). Style vocabulary is shared with <Button>.
 */
type Variant = ButtonVariant;
type Size = ButtonSize;

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
      className={clsx(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
