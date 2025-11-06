'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { isAuthenticated } from '@/lib/auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show navbar on authenticated pages (not login)
  const showNavbar = mounted && pathname !== '/login' && isAuthenticated();

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}

