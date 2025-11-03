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
import { Users, Calendar, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userInfo = await apiClient.getCurrentUser();
        setIsAdmin(userInfo.is_admin);
      } catch (error) {
        // If error, assume not admin
        setIsAdmin(false);
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
  ];

  // Compliance link (visible to all authenticated users)
  const complianceLink = { href: '/compliance', label: 'Compliance', icon: CheckCircle };

  // Combine links based on role
  const navLinks = isAdmin === true 
    ? [...adminLinks, complianceLink]
    : isAdmin === false
    ? [complianceLink]
    : []; // Empty while loading

  return (
    <nav className="border-b bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/employees" className="text-xl font-bold">
              rTrack
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <IconComponent className="mr-2 h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

