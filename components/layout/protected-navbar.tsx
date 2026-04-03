'use client';

import { useState, useEffect } from 'react';
import { LogOut, Settings } from 'lucide-react';
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
  const [companyName, setCompanyName] = useState<string | null>(null);

  const loadUserProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !profile) {
        return;
      }

      if (profile.avatar_url) {
        setAvatarUrl(`${profile.avatar_url}?t=${Date.now()}`);
      }

      let companyNameValue: string | null = null;

      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();

        if (!companyError && company) {
          companyNameValue = company.name ?? null;
        }
      }

      const isDefaultName = companyNameValue?.trim().endsWith("'s Organization");
      setCompanyName(isDefaultName ? null : companyNameValue);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void loadUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleSettingsClose = (open: boolean) => {
    setShowSettings(open);
    if (!open) {
      void loadUserProfile();
    }
  };

  const label = companyName ?? 'Trialetics';

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
                <Avatar className="h-8 w-8" suppressHydrationWarning>
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="User" />}
                  <AvatarFallback suppressHydrationWarning>
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
