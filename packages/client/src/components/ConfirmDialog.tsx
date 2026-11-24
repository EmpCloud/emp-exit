import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = red confirm button, "primary" = brand-coloured confirm button */
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable in-app confirmation dialog — replaces native window.confirm() so
 * destructive/irreversible actions get a styled, on-brand prompt instead of the
 * browser's "<host> says…" alert.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const loadingRef = useRef(loading);

  onCancelRef.current = onCancel;
  loadingRef.current = loading;

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => cancelRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loadingRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="surface-card w-full max-w-md overflow-hidden shadow-floating"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="flex items-start gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              tone === "danger"
                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"
                : "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
