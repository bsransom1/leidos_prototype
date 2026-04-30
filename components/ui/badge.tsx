import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'default' | 'positive' | 'warning' | 'danger' | 'info' | 'accent';

const toneClass: Record<BadgeTone, string> = {
  default:
    'border-ds-border bg-ds-surface-elevated/80 text-ds-text-secondary',
  positive: 'border-emerald-800/60 bg-emerald-950/50 text-emerald-300',
  warning:  'border-amber-700/50 bg-amber-950/40 text-amber-200',
  danger:   'border-red-800/55 bg-red-950/40 text-red-300',
  info:     'border-blue-900/45 bg-[#0c1e3a]/80 text-blue-200',
  accent:   'border-ds-accent/45 bg-[#2a1e04]/70 text-amber-200',
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
