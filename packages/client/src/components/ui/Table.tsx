import type { HTMLAttributes, TableHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function TableShell({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("data-table-shell", className)} {...props} />;
}

export function TableToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("data-table-toolbar", className)} {...props} />;
}

export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("data-table-scroll", className)} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("data-table", className)} {...props} />;
}

export function TableFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3 border-t border-border px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5", className)} {...props} />;
}
