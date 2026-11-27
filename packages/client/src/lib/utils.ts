import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(date: string | Date, locale?: string): string {
  let parsedDate: Date;

  // Date-only API values represent a calendar date, not a UTC timestamp.
  // Constructing them in local time prevents an off-by-one day in negative
  // time zones while timestamps continue to use the browser's local zone.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    parsedDate = new Date(year, month - 1, day);
  } else {
    parsedDate = new Date(date);
  }

  const activeLocale =
    locale ||
    (typeof document !== "undefined" && document.documentElement.lang) ||
    (typeof navigator !== "undefined" && navigator.language) ||
    "en-IN";

  return new Intl.DateTimeFormat(activeLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}
