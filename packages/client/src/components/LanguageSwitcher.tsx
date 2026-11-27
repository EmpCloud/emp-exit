import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "English", flag: "EN" },
  { code: "hi", label: "हिन्दी", flag: "HI" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "ar", label: "العربية", flag: "AR" },
  { code: "pt", label: "Português", flag: "PT" },
  { code: "ja", label: "日本語", flag: "JA" },
  { code: "zh", label: "中文", flag: "ZH" },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = "language-switcher-menu";

  const activeLanguage = i18n.resolvedLanguage || i18n.language;
  const currentLang = LANGUAGES.find((l) => l.code === activeLanguage) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = Math.max(
      0,
      LANGUAGES.findIndex((language) => language.code === activeLanguage),
    );
    itemRefs.current[selectedIndex]?.focus();
  }, [activeLanguage, open]);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    let nextIndex = activeIndex;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % LANGUAGES.length;
    else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + LANGUAGES.length) % LANGUAGES.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = LANGUAGES.length - 1;
    else return;

    event.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color] hover:border-border hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        title={t("common.changeLanguage")}
        aria-label={t("common.changeLanguage")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <Globe className="h-4 w-4" aria-hidden="true" focusable="false" />
        <span className="hidden sm:inline text-xs font-medium">{currentLang.flag}</span>
        <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("common.changeLanguage")}
          onKeyDown={handleMenuKeyDown}
          className="absolute end-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-floating"
        >
          {LANGUAGES.map((lang, index) => (
            <button
              key={lang.code}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={activeLanguage === lang.code}
              tabIndex={activeLanguage === lang.code ? 0 : -1}
              onClick={() => handleChange(lang.code)}
              className={cn(
                "flex min-h-10 w-full items-center gap-2 px-3 text-start text-sm transition-colors hover:bg-muted focus-visible:ring-inset",
                activeLanguage === lang.code
                  ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                  : "text-popover-foreground",
              )}
            >
              <span className="w-6 text-center text-xs font-bold text-muted-foreground">{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {activeLanguage === lang.code ? <Check aria-hidden="true" className="size-4" /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
