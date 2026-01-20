'use client';

import { useState, useEffect } from 'react';
import { LogOut, Settings, Shield } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import Logo from '@/components/layout/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/client';
import { ProfileSettingsModal } from '@/components/profile/profile-settings-modal';

export function ProtectedNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, role')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.avatar_url) {
          // Add timestamp to force reload
          setAvatarUrl(`${profile.avatar_url}?t=${Date.now()}`);
        }
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleSettingsClose = (open: boolean) => {
    setShowSettings(open);
    // Reload profile when modal closes in case it was updated
    if (!open) {
      loadUserProfile();
    }
  };

  const isAdmin = userRole === 'admin';

  // Determine the label based on the current route
  const isDashboard = pathname?.startsWith('/protected/dashboard');
  const label = isDashboard ? 'CTMS' : 'Polares Custom Modules';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Logo href="/protected" />
            <span className="text-sm font-light">| {label}</span>
          </div>

          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer outline-none" suppressHydrationWarning>
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="User" />}
                  <AvatarFallback>
                    <Settings className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setShowSettings(true)} 
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push('/protected/admin')} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ProfileSettingsModal 
        open={showSettings} 
        onOpenChange={handleSettingsClose} 
      />
    </>
  );
}
