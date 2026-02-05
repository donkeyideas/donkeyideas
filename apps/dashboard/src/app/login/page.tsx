'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import ScrollHeader from '@/components/scroll-header';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Focus TOTP input when 2FA is required
  useEffect(() => {
    if (requires2FA && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [requires2FA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = requires2FA
        ? { email, password, totpCode }
        : { email, password };

      const response = await api.post('/auth/login', payload);

      // Check if 2FA is required
      if (response.data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (response.data.user) {
        router.push('/app/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
      // Clear TOTP code on error but stay in 2FA mode
      if (requires2FA) {
        setTotpCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setTotpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Navigation */}
      <ScrollHeader />

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 pt-32 pb-24">
        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-light tracking-wider mb-2">
                <span className="font-light">DONKEY</span> <span className="font-bold">IDEAS</span>
              </h1>
              <p className="text-slate-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {requires2FA ? (
                /* 2FA Verification Step */
                <>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to login
                  </button>

                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Two-Factor Authentication</h3>
                    <p className="text-slate-400 text-sm">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Authentication Code</label>
                    <input
                      ref={totpInputRef}
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || totpCode.length !== 6}
                    className="w-full px-8 py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </>
              ) : (
                /* Standard Login Form */
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-8 py-3 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign up
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="/ventures" className="hover:text-white transition-colors">
                Ventures
              </Link>
              <Link href="/services" className="hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/process" className="hover:text-white transition-colors">
                Approach
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Donkey Ideas
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


