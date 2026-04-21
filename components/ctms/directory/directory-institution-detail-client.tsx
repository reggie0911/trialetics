'use client';

import { useTransition } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateInstitution,
  removeInstitutionStudyLink,
  upsertInstitutionStudyLink,
  setInstitutionStatus,
} from '@/lib/actions/directory-institutions';
import { institutionFormSchema } from '@/lib/validation/directory';
import type { InstitutionRow } from '@/lib/types/directory';
import { DirectoryComments } from '@/components/ctms/directory/directory-comments-card';
import type { DirectoryCommentRow } from '@/lib/actions/directory-comments';
import type { Study } from '@/lib/types/ctms';
import { INSTITUTION_STUDY_RELATIONSHIP_OPTIONS, INSTITUTION_TYPE_OPTIONS } from '@/lib/types/directory';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import {
  PlacesAddressAutocomplete,
  type ParsedPlace,
} from '@/components/ui/places-address-autocomplete';
import { SiteMap } from '@/components/ctms/sites/site-map';

type InstitutionDetail = InstitutionRow & {
  institution_study: {
    id: string;
    study_id: string;
    relationship_type: string;
    studies?: unknown;
  }[];
  institution_study_site: {
    id: string;
    study_site_id: string;
    study_sites?: unknown;
  }[];
  directory_contact_institution: {
    id: string;
    directory_contact_id: string;
    is_primary: boolean;
    directory_contacts?: unknown;
  }[];
  parent?: { id: string; name: string } | null;
};

interface Props {
  institution: InstitutionDetail;
  canEdit: boolean;
  studies: Study[];
  currentUserId: string;
  initialComments: DirectoryCommentRow[];
}

export function DirectoryInstitutionDetailClient({
  institution: initial,
  canEdit,
  studies,
  currentUserId,
  initialComments,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [studyOpen, setStudyOpen] = useState(false);

  const form = useForm<
    z.input<typeof institutionFormSchema>,
    unknown,
    z.infer<typeof institutionFormSchema>
  >({
    resolver: zodResolver(institutionFormSchema),
    defaultValues: {
      name: initial.name,
      organization_type: initial.organization_type,
      address_line1: initial.address_line1 ?? '',
      address_line2: initial.address_line2 ?? '',
      city: initial.city ?? '',
      state_region: initial.state_region ?? '',
      postal_code: initial.postal_code ?? '',
      country_code: initial.country_code ?? '',
      region: initial.region ?? '',
      status: initial.status,
      notes: initial.notes ?? '',
      // Not shown in UI; preserved on save from server record.
      parent_institution_id: initial.parent_institution_id ?? '',
    },
  });

  const watchedCountryCode = useWatch({ control: form.control, name: 'country_code' });
  const mapAddressLine1 = useWatch({ control: form.control, name: 'address_line1' });
  const mapCity = useWatch({ control: form.control, name: 'city' });
  const mapStateRegion = useWatch({ control: form.control, name: 'state_region' });
  const mapPostal = useWatch({ control: form.control, name: 'postal_code' });
  const mapLocationKey = [mapAddressLine1, mapCity, mapStateRegion, mapPostal].join('|');

  const onInstitutionAddressPlaceSelected = (parsed: ParsedPlace) => {
    form.setValue('city', parsed.city ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    const regionLabel = parsed.stateLong ?? parsed.state ?? '';
    form.setValue('state_region', regionLabel, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue('region', regionLabel, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue('postal_code', parsed.postalCode ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    const cc = form.getValues('country_code');
    if (parsed.countryCode && (!cc || cc === parsed.countryCode)) {
      form.setValue('country_code', parsed.countryCode, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  };

  const normStudy = (s: unknown) => (Array.isArray(s) ? s[0] : s) as { title?: string; protocol_number?: string; study_name?: string | null } | null;
  const normContact = (c: unknown) =>
    (Array.isArray(c) ? c[0] : c) as {
      first_name?: string;
      last_name?: string;
      email?: string;
      directory_roles?: { id?: string; name?: string } | null;
    } | null;

  const onSave = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const { error } = await updateInstitution(initial.id, {
        ...values,
        parent_institution_id: initial.parent_institution_id ?? null,
        address_line1: values.address_line1 || undefined,
        address_line2: values.address_line2 || undefined,
        city: values.city || undefined,
        state_region: values.state_region || undefined,
        postal_code: values.postal_code || undefined,
        country_code: values.country_code || undefined,
        region: values.region || undefined,
        notes: values.notes || undefined,
      });
      if (error) toast.error(error);
      else {
        toast.success('Organization updated');
        router.refresh();
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{initial.name}</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                startTransition(async () => {
                  const next = initial.status === 'active' ? 'inactive' : 'active';
                  const { error } = await setInstitutionStatus(initial.id, next);
                  if (error) toast.error(error);
                  else {
                    toast.success(next === 'active' ? 'Activated' : 'Deactivated');
                    router.refresh();
                  }
                });
              }}
            >
              {initial.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Organization profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-3 max-w-xl">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="text-xs h-9" {...form.register('name')} disabled={!canEdit} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Organization type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
                disabled={!canEdit}
                {...form.register('organization_type')}
              >
                {INSTITUTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Controller
              name="address_line1"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <Label className="text-xs">Address line 1</Label>
                  <PlacesAddressAutocomplete
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onPlaceSelected={onInstitutionAddressPlaceSelected}
                    countryBias={watchedCountryCode || null}
                    disabled={!canEdit}
                    aria-invalid={fieldState.invalid}
                    className="text-xs h-9"
                  />
                </div>
              )}
            />
            <DirectoryCountryRegionFields
              variant="institutionAddress"
              countryCode={form.watch('country_code') ?? ''}
              region={form.watch('region') ?? ''}
              onCountryChange={(c) => {
                form.setValue('country_code', c, { shouldDirty: true });
              }}
              onRegionChange={(r) => form.setValue('region', r, { shouldDirty: true })}
              disabled={!canEdit}
              citySlot={
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input className="text-xs h-9" {...form.register('city')} disabled={!canEdit} />
                </div>
              }
            />
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
                disabled={!canEdit}
                {...form.register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {canEdit && (
              <Button type="submit" size="sm" className="text-xs" disabled={form.formState.isSubmitting}>
                Save
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <SiteMap
        key={mapLocationKey}
        siteName={initial.name}
        address={mapAddressLine1 || null}
        city={mapCity || null}
        state={mapStateRegion || null}
        postalCode={mapPostal || null}
        persistence={{ kind: 'institution', institutionId: initial.id }}
        savedAirport={{
          placeId: initial.nearest_airport_place_id ?? null,
          name: initial.nearest_airport_name ?? null,
          address: initial.nearest_airport_address ?? null,
        }}
        savedHotel={{
          placeId: initial.nearest_hotel_place_id ?? null,
          name: initial.nearest_hotel_name ?? null,
          address: initial.nearest_hotel_address ?? null,
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Linked studies</CardTitle>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setStudyOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Study</TableHead>
                <TableHead className="text-xs">Relationship</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.institution_study.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-xs text-muted-foreground">
                    No study links.
                  </TableCell>
                </TableRow>
              ) : (
                initial.institution_study.map((row) => {
                  const st = normStudy(row.studies);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {st ? (st.study_name || st.protocol_number) : '—'}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{row.relationship_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              startTransition(async () => {
                                await removeInstitutionStudyLink(row.id);
                                toast.success('Removed');
                                router.refresh();
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">People</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Primary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.directory_contact_institution.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-muted-foreground">
                    No linked contacts — link from each contact profile.
                  </TableCell>
                </TableRow>
              ) : (
                initial.directory_contact_institution.map((row) => {
                  const dc = normContact(row.directory_contacts);
                  const role = dc?.directory_roles;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {dc ? `${dc.first_name} ${dc.last_name}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dc?.email ?? '—'}</TableCell>
                      <TableCell className="text-xs">{role?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.is_primary ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DirectoryComments
        entityType="institution"
        entityId={initial.id}
        canEdit={canEdit}
        currentUserId={currentUserId}
        initialComments={initialComments}
      />

      <InstStudyDialog
        open={studyOpen}
        onOpenChange={setStudyOpen}
        institutionId={initial.id}
        studies={studies}
        existing={new Set(initial.institution_study.map((x) => `${x.study_id}-${x.relationship_type}`))}
        onDone={() => {
          setStudyOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function InstStudyDialog({
  open,
  onOpenChange,
  institutionId,
  studies,
  existing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  studies: Study[];
  existing: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_id = String(fd.get('study_id'));
    const relationship_type = String(fd.get('relationship_type')) as 'sponsor' | 'cro' | 'central_lab' | 'imaging_vendor' | 'other';
    const key = `${study_id}-${relationship_type}`;
    if (existing.has(key)) {
      toast.error('This relationship already exists');
      return;
    }
    setPending(true);
    const { error } = await upsertInstitutionStudyLink({
      institution_id: institutionId,
      study_id,
      relationship_type,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link study</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Study</Label>
            <select name="study_id" required className="flex h-9 w-full rounded-md border border-input px-2 text-xs">
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.study_name || s.protocol_number}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Relationship</Label>
            <select
              name="relationship_type"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {INSTITUTION_STUDY_RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
