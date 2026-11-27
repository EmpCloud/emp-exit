import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("field-label", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("control", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("control", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("control min-h-28 resize-y py-3", className)} {...props} />;
}

export function FieldMessage({ className, error, ...props }: HTMLAttributes<HTMLParagraphElement> & { error?: boolean }) {
  return <p className={cn("mt-1.5 text-xs", error ? "text-danger" : "text-muted-foreground", className)} {...props} />;
}
