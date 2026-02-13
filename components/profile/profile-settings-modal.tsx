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
import { User, Lock, Building2 } from 'lucide-react';
import { PersonalInfoForm } from './personal-info-form';
import { PasswordChangeForm } from './password-change-form';
import { CompanySettingsForm } from './company-settings-form';

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
