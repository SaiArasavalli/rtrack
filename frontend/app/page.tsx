'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api';
import { getCachedAdminStatus } from '@/lib/admin-cache';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const checkAdminAndRedirect = async () => {
      try {
        // Check cache first
        const cachedAdminStatus = getCachedAdminStatus();
        if (cachedAdminStatus !== null) {
          setIsAdmin(cachedAdminStatus);
          setChecking(false);
          // Redirect based on admin status
          if (cachedAdminStatus) {
            router.replace('/employees');
          } else {
            router.replace('/compliance');
          }
          return;
        }

        // Fetch user info to check admin status
        const user = await apiClient.getCurrentUser();
        const adminStatus = user.is_admin;
        setIsAdmin(adminStatus);
        setChecking(false);
        
        // Redirect based on admin status
        if (adminStatus) {
          router.replace('/employees');
        } else {
          router.replace('/compliance');
        }
      } catch (error) {
        setChecking(false);
        // On error, redirect to compliance as default
        router.replace('/compliance');
      }
    };

    checkAdminAndRedirect();
  }, [router]);

  if (!mounted || !isAuthenticated()) {
    return null;
  }

  if (checking) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-slate-600">Loading...</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return null;
}
