'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { inviteUser, type ModuleWithUserCount } from '@/lib/actions/admin';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  admin: 'Admin',
};

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'user']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface OnboardingStepInviteProps {
  companyId: string;
  profileId: string;
  modules: ModuleWithUserCount[];
  onInvited: () => void;
  onSkip: () => void;
}

export function OnboardingStepInvite({
  companyId,
  profileId,
  modules,
  onInvited,
  onSkip,
}: OnboardingStepInviteProps) {
  const { toast } = useToast();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
    },
  });

  const currentRole = watch('role');

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const onSubmit = async (data: InviteFormValues) => {
    try {
      const result = await inviteUser(
        data.email,
        data.firstName || null,
        data.lastName || null,
        data.role,
        selectedModules,
        companyId,
        profileId
      );

      if (result.success) {
        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${data.email}`,
        });
        reset({
          email: '',
          firstName: '',
          lastName: '',
          role: 'user',
        });
        setSelectedModules([]);
      } else {
        toast({
          title: 'Failed to send invitation',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    }
  };

  const activeModules = modules.filter((m) => m.active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5" />
          Invite Your Team
        </CardTitle>
        <CardDescription>
          Send an invitation to add a team member to your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[12px]">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                className="pl-9 text-[12px]"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-[12px]">
                First Name
              </Label>
              <Input
                id="firstName"
                placeholder="First name"
                className="text-[12px]"
                {...register('firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-[12px]">
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="Last name"
                className="text-[12px]"
                {...register('lastName')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-[12px]">
              Role
            </Label>
            <Select
              value={currentRole}
              onValueChange={(v) => (v === 'admin' || v === 'user') && setValue('role', v)}
            >
              <SelectTrigger id="role" className="text-[12px]">
                <SelectValue placeholder="Select role">
                  {currentRole ? ROLE_LABELS[currentRole] ?? currentRole : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user" className="text-[12px]">User</SelectItem>
                <SelectItem value="admin" className="text-[12px]">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeModules.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[12px]">Module Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {activeModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center space-x-2 rounded-md border p-2"
                  >
                    <Checkbox
                      id={`mod-${mod.id}`}
                      checked={selectedModules.includes(mod.id)}
                      onCheckedChange={() => handleModuleToggle(mod.id)}
                    />
                    <label
                      htmlFor={`mod-${mod.id}`}
                      className="flex-1 cursor-pointer text-[12px] leading-none"
                    >
                      {mod.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="text-[12px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onSkip} disabled={isSubmitting} className="text-[12px]">
              Skip
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
