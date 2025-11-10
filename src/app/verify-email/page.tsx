'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message,setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) return setStatus('error');

      try {
        const res = await fetch(`http://localhost:5000/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        // console.log(data);

        if (res.ok) {
          setStatus('success');
          setMessage(data.message)
          setTimeout(() => router.push('/onboarding'), 3000); // redirect after success
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };

    verify();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      {status === 'loading' && <p>🔄 Verifying your email, please wait...</p>}
      {status === 'success' && (
        <p className="text-green-600 font-medium">
          ✅ Your email has been verified successfully! Redirecting...
        </p>
      )}
      {status === 'error' && (
        <p className="text-red-600 font-medium">
          ❌ Invalid or expired verification link.
        </p>
      )}
    </div>
  );
}
