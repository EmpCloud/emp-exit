// ============================================================================
// ConfirmDialog — drop-in replacement for window.confirm()
//
// Usage:
//   <ConfirmDialog
//     open={isOpen}
//     title="Mark exit complete?"
//     description="This will deactivate the employee account."
//     confirmText="Complete Exit"
//     variant="danger" | "success" | "info"
//     loading={mutation.isPending}
//     onConfirm={() => mutation.mutate()}
//     onCancel={() => setOpen(false)}
//   />
//
// Plain Tailwind + a portal — no extra dependencies. Closes on ESC or
// backdrop click (when not loading). Focus is sent to the confirm button
// on open.
// ============================================================================

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type Variant = "danger" | "success" | "info";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES: Record<Variant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; button: string }> = {
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    button: "bg-green-600 hover:bg-green-700",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    button: "bg-rose-600 hover:bg-rose-700",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;

  // ESC closes (unless loading); focus the confirm button on open.
  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity animate-in fade-in"
        onClick={() => !loading && onCancel()}
      />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={() => !loading && onCancel()}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 rounded-full p-2 ${style.iconBg}`}>
              <Icon className={`h-5 w-5 ${style.iconColor}`} />
            </div>
            <div className="flex-1">
              <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900">
                {title}
              </h2>
              {description && (
                <p className="mt-2 text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${style.button}`}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
