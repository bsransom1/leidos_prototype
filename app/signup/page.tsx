'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CardSection } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user && !data.session) {
        setError('Please check your email to confirm your account before signing in.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const isInfoMessage = error?.includes('check your email');

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-page px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ds-text">Create account</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
            Request workspace access
          </p>
        </div>

        <div className="overflow-hidden border border-ds-border bg-ds-surface shadow-ds-md">
          <CardSection>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="signup-confirm">Confirm password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className={`rounded-ds-sm border px-3 py-2 text-sm ${
                    isInfoMessage
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-red-300 bg-red-50 text-red-600'
                  }`}
                >
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={loading} block>
                {loading ? 'Creating account…' : 'Register'}
              </Button>
            </form>

            <div className="mt-8 border-t border-ds-border pt-6 text-center">
              <p className="text-xs text-ds-text-muted">
                Already registered?{' '}
                <ButtonLink href="/login" variant="ghost" prefetch={false} className="inline !px-0 !py-0 text-ds-accent">
                  Sign in
                </ButtonLink>
              </p>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  );
}
