import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'default' | 'positive' | 'warning' | 'danger' | 'info' | 'accent';

const toneClass: Record<BadgeTone, string> = {
  default:  'border-gray-200 bg-gray-100 text-gray-600',
  positive: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  warning:  'border-amber-300 bg-amber-50 text-amber-700',
  danger:   'border-red-300 bg-red-50 text-red-600',
  info:     'border-blue-300 bg-blue-50 text-blue-700',
  accent:   'border-violet-300 bg-violet-50 text-violet-700',
};

export function Badge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.08em]',
        toneClass[tone],
        className
      )}
      {...props}
    />
  );
}
