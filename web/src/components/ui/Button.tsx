"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  href,
  target,
  rel,
  type = "button",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-600 active:scale-[0.98] shadow-sm hover:shadow-md",
    secondary:
      "bg-primary-100 text-primary-700 hover:bg-primary-200 active:scale-[0.98]",
    outline:
      "border border-border text-gray-700 bg-white hover:border-primary/50 hover:text-primary active:scale-[0.98] shadow-2xs",
    ghost:
      "text-gray-700 hover:bg-primary-50 hover:text-primary active:scale-[0.98]",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-sm",
  };

  const sizes = {
    xs: "h-7 px-2.5 text-xs",
    sm: "h-9 px-3.5 text-xs md:text-sm",
    md: "h-10 md:h-11 px-4 md:px-5 text-sm",
    lg: "h-11 md:h-12 px-6 text-base",
  };

  const content = (
    <>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </>
  );

  const combinedClassName = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link href={href} className={combinedClassName} target={target} rel={rel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
}
