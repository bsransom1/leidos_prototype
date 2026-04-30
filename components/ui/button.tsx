'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type DSButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variantClasses: Record<DSButtonVariant, string> = {
  primary:
    'border border-ds-primary bg-ds-primary text-white hover:bg-ds-primary-hover hover:border-ds-primary-hover active:brightness-90 shadow-ds-sm disabled:opacity-50',
  secondary:
    'border border-ds-border bg-transparent text-ds-text-secondary hover:bg-white/[0.05] hover:border-ds-border-strong disabled:opacity-50',
  ghost:
    'border border-transparent bg-transparent text-ds-text-muted hover:text-ds-text hover:bg-white/[0.04] disabled:opacity-50',
  destructive:
    'border border-red-900/70 bg-transparent text-red-400 hover:bg-red-950/40 disabled:opacity-50',
};

/** Uppercase stencil-style shell — consistent with military/defense UI conventions */
const shell =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors rounded-ds-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ds-accent focus-visible:ring-offset-1 focus-visible:ring-offset-ds-page [&:disabled]:pointer-events-none [&:disabled]:opacity-50';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DSButtonVariant;
  block?: boolean;
}) {
  const { className, variant = 'primary', block, type = 'button', ...rest } = props;
  return (
    <button
      type={type}
      className={cn(shell, variantClasses[variant], block && 'w-full', className)}
      {...rest}
    />
  );
}

export function ButtonLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    variant?: DSButtonVariant;
    block?: boolean;
    children?: ReactNode;
    prefetch?: boolean;
  },
) {
  const { href, className, variant = 'primary', block, prefetch, ...rest } = props;
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(shell, variantClasses[variant], block && 'w-full', className)}
      {...rest}
    />
  );
}
