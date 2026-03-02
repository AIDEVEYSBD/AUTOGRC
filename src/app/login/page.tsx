'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        // Full page navigation so the server layout re-reads the cookie
        // and isAuthenticated propagates correctly. Keep loading=true
        // so the spinner stays visible during the (potentially slow) transition.
        window.location.href = '/overview';
      } else {
        setError('Invalid username or password.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-md-surface px-4">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-md-primary-container/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-md-primary-container/5 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFE600] mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#2E2E38" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-md-on-surface">AutoGRC</h1>
          <p className="text-sm text-md-on-surface-variant mt-1">Sign in to access the platform</p>
        </div>

        {/* Card */}
        <div className="bg-md-surface-container border border-md-outline-variant rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-md-on-surface mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-md-surface border border-md-outline-variant text-md-on-surface placeholder-md-on-surface-variant focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-md-on-surface mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-md-surface border border-md-outline-variant text-md-on-surface placeholder-md-on-surface-variant focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p className="text-sm text-md-error bg-md-error/10 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 px-4 font-bold rounded-xl bg-[#FFE600] text-[#2E2E38] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-[#2E2E38]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-md-on-surface-variant hover:text-md-on-surface transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
