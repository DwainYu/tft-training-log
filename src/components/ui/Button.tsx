import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-gold-500/45 bg-gold-500/12 text-gold-300 hover:bg-gold-500/22 font-medium",
  secondary: "border-line bg-base-800 text-ink-200 hover:bg-base-700",
  ghost: "border-transparent bg-transparent text-ink-400 hover:bg-base-800 hover:text-ink-200",
  danger: "border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-10 px-3.5 text-sm gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }): ReactNode {
  return <button className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest} />;
}

export function LinkButton({
  to,
  variant = "secondary",
  size = "md",
  className = "",
  children,
  title,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  title?: string;
}): ReactNode {
  return (
    <Link to={to} title={title} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}
