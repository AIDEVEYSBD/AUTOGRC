'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        window.location.href = '/overview';
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not reset your password.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#1A1A24', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="w-full max-w-[420px] bg-white p-8 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-[20px] font-bold" style={{ color: '#1A1A24', letterSpacing: '-0.02em' }}>AutoGRC</span>
        </div>
        <h3 className="m-0 text-[26px] font-bold" style={{ color: '#1A1A24', letterSpacing: '-0.03em' }}>Choose a new password</h3>
        <p className="m-0 mb-6 text-[14px]" style={{ color: '#747480', letterSpacing: '-0.01em' }}>Enter and confirm your new password.</p>

        {!token ? (
          <p className="px-3 py-2.5 text-[13px]" style={{ background: 'rgba(255,65,54,0.1)', color: '#C32A1F' }}>
            Missing reset token. Please use the link from your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <label className="mb-1.5 text-[12px] font-bold" style={{ color: '#747480' }}>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
              className="mb-4 px-3.5 py-3 text-[14px] outline-none" style={{ border: '1px solid #C4C4CD', color: '#1A1A24' }} />
            <label className="mb-1.5 text-[12px] font-bold" style={{ color: '#747480' }}>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading}
              className="mb-5 px-3.5 py-3 text-[14px] outline-none" style={{ border: '1px solid #C4C4CD', color: '#1A1A24' }} />

            {error && <p className="mb-3 px-3 py-2.5 text-[13px]" style={{ background: 'rgba(255,65,54,0.1)', color: '#C32A1F' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="p-3.5 text-[15px] font-bold disabled:opacity-60"
              style={{ background: '#FFE600', color: '#1A1A24', border: 0, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.02em' }}>
              {loading ? 'Saving…' : 'Reset password & sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
