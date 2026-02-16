'use client';

import { useState, useEffect } from 'react';
import { LogOut, Settings, Shield, Rocket, ListChecks } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

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
  const [showCompleteSetup, setShowCompleteSetup] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [pathname]);

  const loadUserProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Loading profile for user:', user.id);
      
      // Simplified query - just get profile data without nested company join
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, role, onboarding_completed_at, company_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Profile query error - code:', error.code, 'message:', error.message);
        return;
      }
      
      if (!profile) {
        console.log('No profile found for user');
        return;
      }
      
      console.log('Profile loaded, company_id:', profile.company_id);
      
      if (profile.avatar_url) {
        setAvatarUrl(`${profile.avatar_url}?t=${Date.now()}`);
      }
      if (profile.role) {
        setUserRole(profile.role);
      }
      
      // Fetch company name separately if company_id exists
      let companyNameValue: string | null = null;
      
      if (profile.company_id) {
        console.log('Fetching company name for ID:', profile.company_id);
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        
        if (companyError) {
          console.error('Company query error - code:', companyError.code, 'message:', companyError.message);
        } else if (company) {
          companyNameValue = company.name ?? null;
          console.log('Company name loaded:', companyNameValue);
        }
      }
      
      console.log('Setting company name to:', companyNameValue);
      setCompanyName(companyNameValue);
      
      setShowCompleteSetup(
        profile.role === 'admin' &&
        !profile.onboarding_completed_at &&
        pathname !== '/protected/onboarding'
      );
    } catch (error) {
      console.error('Unexpected error in loadUserProfile:', error);
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

  // Determine the label based on company name or route fallback
  const isDashboard = pathname?.startsWith('/protected/dashboard');
  const label = companyName ?? (isDashboard ? 'CTMS' : 'Trialetics');

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
                {showCompleteSetup && (
                  <DropdownMenuItem
                    onClick={() => router.push('/protected/onboarding')}
                    className="cursor-pointer"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    <span>Complete setup</span>
                  </DropdownMenuItem>
                )}
                {isAdmin && pathname !== '/protected/onboarding' && (
                  <DropdownMenuItem
                    onClick={() => router.push('/protected/onboarding')}
                    className="cursor-pointer"
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    <span>Setup wizard</span>
                  </DropdownMenuItem>
                )}
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
        onDataSaved={loadUserProfile}
      />
    </>
  );
}
