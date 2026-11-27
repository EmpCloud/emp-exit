import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  ghost: "button-ghost",
  danger: "button-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function Button({ className, type = "button", variant = "primary", ...props }, ref) {
    return <button ref={ref} type={type} className={cn(variants[variant], className)} {...props} />;
  },
);

export function ButtonLink({ className, variant = "primary", ...props }: LinkProps & { variant?: ButtonVariant }) {
  return <Link className={cn(variants[variant], className)} {...props} />;
}
