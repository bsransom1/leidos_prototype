import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        'w-full border-collapse text-left text-sm text-ds-text-secondary',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-ds-border bg-ds-surface-elevated/60', className)} {...props} />
  );
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({
  interactive,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-ds-border transition-colors last:border-none',
        interactive && 'cursor-pointer hover:bg-white/[0.03]',
        className
      )}
      {...props}
    />
  );
}

export function TableHeadCell(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted'
      )}
      {...props}
    />
  );
}

export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-sm text-ds-text')} {...props} />;
}
