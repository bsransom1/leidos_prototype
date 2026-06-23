'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PassBrand } from '@/components/ui/app-shell';

/** Fallback if middleware redirect is bypassed — sends visitors to /demo or /dashboard. */
export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const route = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        router.replace(user ? '/dashboard' : '/demo');
      } catch {
        router.replace('/demo');
      }
    };
    route();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-page">
      <PassBrand size="md" />
    </div>
  );
}
