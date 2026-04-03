'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Building2, Compass } from 'lucide-react';
import { PersonalInfoForm } from './personal-info-form';
import { PasswordChangeForm } from './password-change-form';
import { CompanySettingsForm } from './company-settings-form';
import { GuidedSetupForm } from './guided-setup-form';

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when profile/company data is saved - use to refresh navbar, etc. */
  onDataSaved?: () => void;
}

export function ProfileSettingsModal({ open, onOpenChange, onDataSaved }: ProfileSettingsModalProps) {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('personal');

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    router.refresh();
    onDataSaved?.();

    // Show success message briefly
    setTimeout(() => {
      setSuccessMessage('');
      onOpenChange(false);
    }, 1500);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSuccessMessage('');
      setActiveTab('personal');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Manage your profile information and security settings
          </DialogDescription>
        </DialogHeader>

        {successMessage && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
            <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Company</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
              <Lock className="h-4 w-4 shrink-0" />
              <span className="truncate">Security</span>
            </TabsTrigger>
            <TabsTrigger value="guided" className="gap-1.5 text-xs sm:text-sm py-2 px-2">
              <Compass className="h-4 w-4 shrink-0" />
              <span className="truncate">Guided setup</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6">
            <PersonalInfoForm 
              onSuccess={() => handleSuccess('Profile updated successfully!')} 
            />
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <CompanySettingsForm 
              onSuccess={() => handleSuccess('Company updated successfully!')} 
            />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <PasswordChangeForm 
              onSuccess={() => handleSuccess('Password updated successfully!')} 
            />
          </TabsContent>

          <TabsContent value="guided" className="mt-6">
            <GuidedSetupForm onUpdated={() => onDataSaved?.()} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
