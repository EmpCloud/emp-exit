import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";

type MetricTone = "brand" | "blue" | "emerald" | "amber" | "violet";

const tones: Record<MetricTone, { icon: string; glow: string }> = {
  brand: { icon: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300", glow: "from-brand-100/70 dark:from-brand-950/30" },
  blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300", glow: "from-blue-100/70 dark:from-blue-950/30" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300", glow: "from-emerald-100/70 dark:from-emerald-950/30" },
  amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300", glow: "from-amber-100/70 dark:from-amber-950/30" },
  violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300", glow: "from-violet-100/70 dark:from-violet-950/30" },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: MetricTone;
  helper?: string;
  to?: string;
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, tone = "brand", helper, to, className }: MetricCardProps) {
  const content = (
    <>
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent opacity-60", tones[tone].glow)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground" data-numeric>{value}</p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone].icon)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      {to ? <ArrowUpRight aria-hidden="true" className="absolute bottom-4 end-4 size-4 text-muted-foreground/60" /> : null}
    </>
  );

  const classes = cn("surface-card relative min-h-36 overflow-hidden p-5", to && "surface-card--interactive focus-visible:ring-2 focus-visible:ring-ring", className);

  return to ? <Link to={to} className={classes}>{content}</Link> : <article className={classes}>{content}</article>;
}
