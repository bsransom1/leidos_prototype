'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PassBrand } from '@/components/ui/app-shell';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.push('/dashboard');
        }
      } catch {
        /* offline / unreachable Supabase: stay on landing */
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-page px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <PassBrand size="lg" />
          </div>
          <p className="mx-auto mb-10 max-w-lg text-[15px] leading-relaxed text-ds-text-secondary">
            Solicitation analysis and compliant proposal generation. Ingest BAAs/RFPs, attach organization
            context, and produce review-ready drafts with structured confidence scoring.
          </p>
        </div>

        <Card className="overflow-hidden shadow-ds-md">
          <div className="space-y-3 p-8">
            <ButtonLink href="/login" variant="primary" block prefetch={false}>
              Sign in
            </ButtonLink>
            <ButtonLink href="/signup" variant="secondary" block prefetch={false}>
              Create account
            </ButtonLink>
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-ds-text-muted">
          Unclassified prototype • Internal evaluation only
        </p>
      </div>
    </div>
  );
}
