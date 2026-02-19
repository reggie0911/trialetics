'use client';

import React from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalInfoForm } from '@/components/profile/personal-info-form';

interface OnboardingStepPersonalInfoProps {
  onComplete: () => void;
}

export function OnboardingStepPersonalInfo({ onComplete }: OnboardingStepPersonalInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Add your photo and contact details to complete your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PersonalInfoForm onSuccess={onComplete} />
      </CardContent>
    </Card>
  );
}
