'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuthFormProps {
  type: 'login' | 'signup';
}

export default function AuthForm({ type }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          router.push('/chat');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/chat');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 premium-card animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[var(--brand-gradient)] mb-2">
          {type === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {type === 'login' 
            ? 'Sign in to stay connected with your friends' 
            : 'Join our community and start chatting today'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {type === 'signup' && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 premium-input"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--color-text-secondary)] ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 premium-input"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--color-text-secondary)] ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 premium-input"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full premium-button group"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {type === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        {type === 'login' ? (
          <p>
            Don't have an account?{' '}
            <Link href="/signup" className="text-[var(--color-brand-primary)] hover:underline">
              Sign up
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-brand-primary)] hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
