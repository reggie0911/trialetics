'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

import { createSite, updateSite } from '@/lib/actions/sites';
import { SITE_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { StudySite, StudyCountry } from '@/lib/types/ctms';

const siteFormSchema = z.object({
  site_number: z.string().min(1, 'Site number is required'),
  name: z.string().min(1, 'Site name is required'),
  study_country_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  pi_name: z.string().optional(),
  pi_email: z.string().optional(),
  status: z.enum(['identified', 'selected', 'initiated', 'activated', 'enrolling', 'closed']).optional(),
  activation_date: z.string().optional(),
  target_enrollment: z.coerce.number().min(0).optional(),
});

type SiteFormValues = z.infer<typeof siteFormSchema>;

interface SiteFormProps {
  studyId: string;
  site?: StudySite;
  countries: Pick<StudyCountry, 'id' | 'country_name' | 'country_code'>[];
  mode: 'create' | 'edit';
}

export function SiteForm({ studyId, site, countries, mode }: SiteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      site_number: site?.site_number ?? '',
      name: site?.name ?? '',
      study_country_id: site?.study_country_id ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      state: site?.state ?? '',
      postal_code: site?.postal_code ?? '',
      pi_name: site?.pi_name ?? '',
      pi_email: site?.pi_email ?? '',
      status: site?.status ?? 'identified',
      activation_date: site?.activation_date ?? '',
      target_enrollment: site?.target_enrollment ?? 0,
    },
  });

  async function onSubmit(values: SiteFormValues) {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data, error } = await createSite({
          study_id: studyId,
          ...values,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Site created successfully');
        router.push(`/protected/sites/${data!.id}`);
      } else {
        const { error } = await updateSite({
          id: site!.id,
          study_id: studyId,
          ...values,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Site updated successfully');
        router.push(`/protected/sites/${site!.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="site_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SITE-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City General Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {countries.length > 0 && (
              <FormField
                control={form.control}
                name="study_country_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                          placeholder="Select Country"
                          getDisplayLabel={(v) =>
                            countries.find((c) => c.id === v)
                              ? `${countries.find((c) => c.id === v)!.country_name} (${countries.find((c) => c.id === v)!.country_code})`
                              : v
                          }
                        />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.country_name} ({c.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder="Select Status"
                          getDisplayLabel={(v) => SITE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SITE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State / Province</FormLabel>
                  <FormControl>
                    <Input placeholder="State or province" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Postal code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Principal Investigator</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="pi_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PI Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pi_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PI Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="pi@hospital.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="target_enrollment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Enrollment</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activation_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activation Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Site' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
