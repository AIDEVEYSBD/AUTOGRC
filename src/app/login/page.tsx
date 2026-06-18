'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('error') === 'link' ? 'That sign-in link was invalid or expired.' : '');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // Shared handler for the magic-link ("magic") and forgot-password ("forgot") emails.
  async function requestLink(kind: 'magic' | 'forgot') {
    setError(''); setInfo('');
    if (!email) { setError('Enter your work email first.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setInfo(data.message || 'Check your email for the link.');
    } catch {
      setError('Could not send the email. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = '/overview';
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invalid email or password.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Brand panel */}
      <div
        className="relative hidden flex-1 flex-col justify-between p-10 text-white md:flex lg:p-16"
        style={{ background: '#1A1A24' }}
      >
        <div className="absolute left-16 top-0 h-[5px] w-40" style={{ background: 'linear-gradient(90deg,#FFE600,#FF32FF,#32FFFF)' }} />
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold" style={{ letterSpacing: '-0.02em' }}>AutoGRC</span>
            <span className="text-[11px]" style={{ color: '#9A9AA6' }}>Automated assurance platform</span>
          </div>
        </div>
        <div className="max-w-[560px]">
          <h2 className="m-0 mb-5 text-[40px] font-bold leading-[1.05] lg:text-[52px]" style={{ letterSpacing: '-0.03em' }}>
            How do you prove compliance the moment someone asks?
          </h2>
          <p className="m-0 max-w-[480px] text-[18px] leading-[1.5]" style={{ color: '#C4C4CD', letterSpacing: '-0.01em' }}>
            Map controls to every framework, test them continuously, and generate audit-ready evidence in minutes — not weeks.
          </p>
        </div>
        <div className="flex items-end justify-between gap-6">
          <p className="m-0 text-[13px] leading-[1.5]" style={{ letterSpacing: '-0.01em' }}>
            The better the question. The better the answer.<br />The better the world works.
          </p>
          <div className="flex gap-[5px]">
            <span className="h-[14px] w-[14px]" style={{ background: '#FFE600' }} />
            <span className="h-[14px] w-[14px]" style={{ background: '#5A5A66' }} />
            <span className="h-[14px] w-[14px]" style={{ background: '#5A5A66' }} />
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex w-full flex-col justify-center gap-1.5 bg-white px-6 py-12 sm:px-14 md:w-[480px] md:flex-none">
        {/* Mobile brand */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <span className="text-[18px] font-bold" style={{ color: '#1A1A24', letterSpacing: '-0.02em' }}>AutoGRC</span>
        </div>

        <h3 className="m-0 text-[30px] font-bold" style={{ color: '#1A1A24', letterSpacing: '-0.03em' }}>Sign in</h3>
        <p className="m-0 mb-6 text-[14px]" style={{ color: '#747480', letterSpacing: '-0.01em' }}>Access your compliance workspace</p>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="mb-1.5 text-[12px] font-bold" style={{ color: '#747480', letterSpacing: '-0.01em' }}>Work email</label>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@company.com"
            className="mb-[18px] px-3.5 py-3 text-[14px] outline-none"
            style={{ border: '1px solid #C4C4CD', background: '#fff', color: '#1A1A24', letterSpacing: '-0.01em' }}
          />
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[12px] font-bold" style={{ color: '#747480', letterSpacing: '-0.01em' }}>Password</label>
            <button type="button" onClick={() => requestLink('forgot')} disabled={busy}
              className="text-[12px] font-bold disabled:opacity-60" style={{ color: '#1A1A24', background: 'transparent', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="mb-6 px-3.5 py-3 text-[14px] outline-none"
            style={{ border: '1px solid #C4C4CD', background: '#fff', color: '#1A1A24', letterSpacing: '-0.01em' }}
          />

          {error && (
            <p className="mb-3 px-3 py-2.5 text-[13px]" style={{ background: 'rgba(255,65,54,0.1)', color: '#C32A1F' }}>{error}</p>
          )}
          {info && (
            <div className="mb-3 px-3 py-2.5 text-[13px]" style={{ background: 'rgba(45,183,87,0.12)', color: '#1A7A3A' }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2.5 p-3.5 text-[15px] font-bold disabled:opacity-60"
            style={{ background: '#FFE600', color: '#1A1A24', border: 0, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.02em' }}
          >
            {loading ? 'Signing in…' : 'Enter platform'}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="2" y1="9" x2="15" y2="9" /><path d="M10 4 L15 9 L10 14" /></svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => requestLink('magic')}
            disabled={busy}
            className="mt-3 p-3 text-[14px] font-bold disabled:opacity-60"
            style={{ background: 'transparent', color: '#1A1A24', border: '1px solid #1A1A24', cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>

        <p className="mt-6 text-[11px]" style={{ color: '#C4C4CD', letterSpacing: '-0.01em' }}>
          Internal demonstration build. No client data.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
