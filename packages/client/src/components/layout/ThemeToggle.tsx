// =============================================================================
// EMP EXIT — Theme Toggle
// Three-way light / dark / system switch. Reads and writes the theme via the
// ThemeProvider (src/lib/theme.tsx), which toggles the `.dark` class on <html>.
// =============================================================================

import { useTheme, type Theme } from "@/lib/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: t("theme.light") },
    { value: "dark", icon: Moon, label: t("theme.dark") },
    { value: "system", icon: Monitor, label: t("theme.system") },
  ];

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex items-center rounded-lg border border-border bg-muted/70 p-1 shadow-sm"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "grid size-9 place-items-center rounded-md transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" focusable="false" />
          </button>
        );
      })}
    </div>
  );
}
