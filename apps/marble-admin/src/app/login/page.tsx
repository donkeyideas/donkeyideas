'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      router.push('/overview');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Donkey Marble Racing" width={80} height={80} className="mx-auto mb-4 rounded-full shadow-lg shadow-gold/20" />
          <h1 className="font-heading text-2xl tracking-wide">
            DONKEY <span className="text-gold">MARBLE</span>
          </h1>
          <p className="text-white/40 text-xs uppercase tracking-[3px] mt-1 font-semibold">
            Admin Dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-marble-red/10 border border-marble-red/30 rounded-lg px-4 py-2 text-sm text-marble-red">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="admin@donkeyideas.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold to-gold-light text-navy-900 font-bold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
