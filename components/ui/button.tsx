'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type DSButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variantClasses: Record<DSButtonVariant, string> = {
  primary:
    'border border-ds-primary bg-ds-primary text-white hover:bg-ds-primary-hover hover:border-ds-primary-hover active:brightness-95 shadow-ds-sm disabled:opacity-50',
  secondary:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50',
  ghost:
    'border border-transparent bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50',
  destructive:
    'border border-red-300 bg-transparent text-red-600 hover:bg-red-50 hover:border-red-400 disabled:opacity-50',
};

const shell =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors rounded-ds-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ds-page [&:disabled]:pointer-events-none [&:disabled]:opacity-50';

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
