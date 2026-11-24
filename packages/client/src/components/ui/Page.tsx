import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Page({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("app-page", className)} {...props} />;
}

export function PageHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn("page-header", className)} {...props} />;
}

export function PageHeaderContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("page-header__content", className)} {...props} />;
}

export function PageEyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("page-header__eyebrow", className)} {...props} />;
}

export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("page-title", className)} {...props} />;
}

export function PageDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("page-subtitle", className)} {...props} />;
}

export function PageActions({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("page-actions", className)} {...props}>
      {children}
    </div>
  );
}
