import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Monospaced field — data-entry style consistent with defense tools */
export const fieldClass =
  'border border-ds-border bg-ds-page px-3 py-2 font-mono text-sm text-ds-text-secondary placeholder:text-ds-text-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ds-accent focus-visible:ring-offset-1 focus-visible:ring-offset-ds-page disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn('w-full', fieldClass, className)}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn('w-full', fieldClass, className)} {...props} />;
  }
);

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
