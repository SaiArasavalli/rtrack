'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check authentication on mount
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check token expiration periodically (every 5 minutes)
    const checkInterval = setInterval(() => {
      if (!isAuthenticated()) {
        router.push('/login');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(checkInterval);
  }, [router]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}

