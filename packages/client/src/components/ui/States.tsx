import type { LucideIcon } from "lucide-react";
import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("loading-state text-muted-foreground", className)} role="status" aria-live="polite">
      <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
      <span className="text-sm font-medium">{label}<span aria-hidden="true">…</span></span>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("empty-state", className)}>
      <span className="empty-state__icon"><Icon aria-hidden="true" className="size-6" /></span>
      <div className="max-w-md space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("empty-state", className)} role="alert">
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-red-50 text-xl font-bold text-red-600 dark:bg-red-950/60 dark:text-red-300">!</span>
      <div className="max-w-md space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
