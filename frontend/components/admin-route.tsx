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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    
    const cachedAdminStatus = getCachedAdminStatus();
    if (cachedAdminStatus !== null) {
      setIsAdmin(cachedAdminStatus);
      setIsChecking(false);
      
      if (!cachedAdminStatus) {
        toast.error('Access denied. Admin privileges required.');
        router.replace('/compliance');
      }
      return;
    }
    
    const checkAdminStatus = async () => {
      try {
        const userInfo = await apiClient.getCurrentUser();
        if (!isMounted) return;
        
        const adminStatus = userInfo.is_admin;
        setCachedAdminStatus(adminStatus);
        
        if (!adminStatus) {
          toast.error('Access denied. Admin privileges required.');
          router.replace('/compliance');
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        if (!isMounted) return;
        toast.error('Failed to verify admin status');
        router.replace('/compliance');
        setIsAdmin(false);
        setCachedAdminStatus(false);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };
    
    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [router, mounted]);

  if (!mounted) {
    return null;
  }

  if (isChecking || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Verifying permissions...</span>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return <>{children}</>;
}

