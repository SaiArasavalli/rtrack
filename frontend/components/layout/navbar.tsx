'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Calendar, CheckCircle, Sparkles, AlertCircle, User, LogOut } from 'lucide-react';
import { apiClient, type UserInfo } from '@/lib/api';
import { toast } from 'sonner';
import { getCachedAdminStatus, setCachedAdminStatus } from '@/lib/admin-cache';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Check cache first
      const cachedAdminStatus = getCachedAdminStatus();
      if (cachedAdminStatus !== null) {
        setIsAdmin(cachedAdminStatus);
      }
      
      try {
        const user = await apiClient.getCurrentUser();
        setUserInfo(user);
        const adminStatus = user.is_admin;
        setCachedAdminStatus(adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        // If error, assume not admin
        setIsAdmin(false);
        setCachedAdminStatus(false);
      }
    };
    
    checkAdminStatus();
  }, []);

  const handleLogout = async () => {
    await apiClient.logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  // Admin-only links
  const adminLinks = [
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/attendance', label: 'Attendance', icon: Calendar },
    { href: '/exceptions', label: 'Exceptions', icon: AlertCircle },
    { href: '/compliance', label: 'Compliance', icon: CheckCircle },
  ];

  // Combine links based on role
  // Normal employees don't need nav links since they're always on the compliance page
  const navLinks = isAdmin === true 
    ? adminLinks
    : []; // Empty for non-admin users

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div className="absolute inset-0 bg-blue-600/20 blur-lg rounded-full"></div>
          </div>
          <Link 
            href="/"
            className="cursor-pointer"
            prefetch={true}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              rTrack
            </h1>
          </Link>
          <div className="hidden md:flex items-center space-x-4 ml-8">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-50 border border-blue-200/50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {userInfo && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/50">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-foreground">
                {userInfo.employee_name || userInfo.employee_id}
              </span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

