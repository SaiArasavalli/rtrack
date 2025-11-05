'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getCachedAdminStatus, setCachedAdminStatus } from '@/lib/admin-cache';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  // Use useEffect to only run on client, preventing hydration mismatch
  useEffect(() => {
    let isMounted = true;
    
    // Check cache first
    const cachedAdminStatus = getCachedAdminStatus();
    if (cachedAdminStatus !== null) {
      // Use cached value immediately
      setIsAdmin(cachedAdminStatus);
      setIsChecking(false);
      
      if (!cachedAdminStatus) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/compliance');
      }
      return;
    }
    
    // Show spinner only after a short delay to avoid flickering on fast checks
    const spinnerTimeout = setTimeout(() => {
      if (isMounted) {
        setShowSpinner(true);
      }
    }, 100);
    
    const checkAdminStatus = async () => {
      try {
        const userInfo = await apiClient.getCurrentUser();
        if (!isMounted) return;
        
        const adminStatus = userInfo.is_admin;
        setCachedAdminStatus(adminStatus);
        
        if (!adminStatus) {
          toast.error('Access denied. Admin privileges required.');
          router.push('/compliance');
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        if (!isMounted) return;
        toast.error('Failed to verify admin status');
        router.push('/compliance');
        setIsAdmin(false);
        setCachedAdminStatus(false);
      } finally {
        if (isMounted) {
          clearTimeout(spinnerTimeout);
          setIsChecking(false);
          setShowSpinner(false);
        }
      }
    };
    
    // Only check after component has mounted on client
    checkAdminStatus();

    return () => {
      isMounted = false;
      clearTimeout(spinnerTimeout);
    };
  }, [router]);

  // Show loading state only if check is taking longer than 100ms
  if ((isChecking || isAdmin === null) && showSpinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Verifying permissions...</span>
      </div>
    );
  }
  
  // While checking but spinner not shown yet, render children (optimistic)
  if (isChecking || isAdmin === null) {
    return <>{children}</>;
  }

  // Not admin - already redirected by useEffect
  if (isAdmin === false) {
    return null;
  }

  // Admin - render children
  return <>{children}</>;
}

