'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CardSection } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PassBrand } from '@/components/ui/app-shell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam === 'email_not_confirmed') {
        setError('Please confirm your email address before signing in.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('email') && error.message.includes('confirm')) {
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        } else {
          setError(error.message || 'Failed to sign in');
        }
        return;
      }

      if (data.user && !data.user.email_confirmed_at) {
        setError(
          'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
        );
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');

      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl));
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-page px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <PassBrand size="md" />
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">Authenticated access only</p>
        </div>

        <div className="overflow-hidden border border-ds-border bg-ds-surface shadow-ds-md">
          <CardSection>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@agency.gov"
                  autoComplete="email"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="mt-2"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-ds-sm border border-red-900/55 bg-red-950/35 px-3 py-2 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={loading} block>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-8 border-t border-ds-border pt-6 text-center">
              <p className="text-xs text-ds-text-muted">
                No account?{' '}
                <ButtonLink href="/signup" variant="ghost" prefetch={false} className="inline !px-0 !py-0 text-ds-accent">
                  Create one
                </ButtonLink>
              </p>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  );
}
