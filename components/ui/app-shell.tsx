'use client';

import type { HTMLAttributes } from 'react';
import Link from 'next/link';
import { type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

// ── P.A.S.S. brand mark ──────────────────────────────────────────────────────

function PassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      {/* Octagonal frame — military patch */}
      <polygon
        points="5.5,1 14.5,1 19,5.5 19,14.5 14.5,19 5.5,19 1,14.5 1,5.5"
        stroke="white"
        strokeWidth="0.8"
        fill="rgba(255,255,255,0.07)"
      />
      {/* Stylised "P" — vertical stem */}
      <line x1="6.5" y1="5" x2="6.5" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="square" />
      {/* Bowl of P */}
      <path
        d="M6.5 5 H11 a3 3 0 0 1 0 6 H6.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* Small circuit node accent */}
      <circle cx="15" cy="15" r="1" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

export function PassBrand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { box: 'h-7 w-7', title: 'text-[10px]', sub: 'text-[9px]', gap: 'gap-2' },
    md: { box: 'h-9 w-9', title: 'text-[11px]', sub: 'text-[10px]', gap: 'gap-2.5' },
    lg: { box: 'h-12 w-12', title: 'text-[14px]', sub: 'text-[11px]', gap: 'gap-4' },
  }[size];

  return (
    <div className={cn('flex items-center', dims.gap)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ds-primary/30 bg-gradient-to-br from-ds-primary via-ds-primary to-[#312e81] p-1.5',
          'shadow-[0_0_14px_rgba(37,99,235,0.25)]',
          dims.box,
        )}
      >
        <PassIcon className="h-full w-full" />
      </div>
      <div>
        <p className={cn('font-mono font-bold uppercase leading-none tracking-[0.22em] text-ds-text', dims.title)}>
          P.A.S.S.
        </p>
        <p className={cn('mt-0.5 font-mono uppercase tracking-[0.1em] text-ds-text-muted', dims.sub)}>
          Proposal Automation Service System
        </p>
      </div>
    </div>
  );
}

export function AppLogoRow({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ds-primary/30 bg-gradient-to-br from-ds-primary via-ds-primary to-[#312e81] p-1.5 shadow-[0_0_10px_rgba(79,70,229,0.2)]">
          <PassIcon className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-text">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ds-text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AppHeader(
  props: Omit<HTMLAttributes<HTMLElement>, 'className'> & { className?: string },
) {
  const { className, ...rest } = props;
  return (
    <header
      className={cn(
        'shrink-0 border-b border-ds-border bg-ds-header',
        className,
      )}
      {...rest}
    />
  );
}

export function AppFooter({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <footer
      className={cn('shrink-0 border-t border-ds-border bg-ds-shell', className)}
      {...rest}
    >
      {children}
    </footer>
  );
}

export function BackLink({
  href,
  className,
  children,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'font-mono text-[10px] uppercase tracking-[0.1em] text-ds-text-muted transition-colors hover:text-ds-text-secondary',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon?: Icon;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
        active
          ? 'border-ds-primary/30 bg-ds-primary/8 text-ds-primary'
          : 'border-transparent text-ds-text-muted hover:border-ds-border hover:bg-ds-shell hover:text-ds-text',
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" weight="bold" aria-hidden /> : null}
      {label}
    </Link>
  );
}
