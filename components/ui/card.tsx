import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Base card — hard edges, structural border */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-ds-border bg-ds-surface shadow-ds-md',
        className
      )}
      {...props}
    />
  );
}

/** Optional top-accent variant used on primary data panels */
export function CardAccent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-ds-border bg-ds-surface shadow-ds-md border-t-2 border-t-ds-accent',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-ds-border px-5 py-3', className)} {...props} />
  );
}

export function CardSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}
