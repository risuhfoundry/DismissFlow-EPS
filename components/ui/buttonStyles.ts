/**
 * Shared button style vocabulary.
 *
 * Both the client <Button> and the server-compatible <LinkButton> render the
 * exact same visual language. This module is the single source for that
 * language so the two never drift apart. No React/hooks here — safe to import
 * from server and client components alike.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 select-none font-medium " +
  "rounded-md transition-colors duration-150 ease-standard " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:pointer-events-none";

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-border/70 border border-border",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-muted",
  ghost: "bg-transparent text-secondary-foreground hover:bg-muted",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover"
};
