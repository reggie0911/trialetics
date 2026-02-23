'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createContact, updateContact, assignContactToOrganization, getContacts } from '@/lib/actions/contacts';
import { getAllOrganizations } from '@/lib/actions/organizations';
import { createAddress, updateAddress, getAddressesByEntity } from '@/lib/actions/addresses';
import { formatPhoneNumber, formatFieldName } from '@/lib/utils';
import {
  Contact,
  Organization,
  EntityStatus,
  ContactRole,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';
import { AddressForm, AddressFormData, emptyAddress, hasAddressData } from './address-form';
import { ContactImageUpload } from './contact-image-upload';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
  credentials: z.string().optional(),
  license_number: z.string().optional(),
  primary_specialty: z.string().optional(),
  profile_image_url: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contact?: Contact | null;
  companyId: string;
  profileId: string;
  userEmail: string;
  userRole?: string;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  onSuccess,
  contact,
  companyId,
  profileId,
  userEmail,
  userRole = 'user',
}: ContactFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressData, setAddressData] = useState<AddressFormData>(emptyAddress);
  const [existingAddressId, setExistingAddressId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ContactRole>('other');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const isEditing = !!contact;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      credentials: '',
      license_number: '',
      primary_specialty: '',
      profile_image_url: '',
      status: 'active',
      notes: '',
    },
  });

  const selectedStatus = watch('status');

  // Get the display name for the selected organization
  const selectedOrgDisplay = selectedOrgId && selectedOrgId !== '' 
    ? organizations.find((org) => org.id === selectedOrgId)
    : null;

  // Load organizations and contacts when dialog opens
  useEffect(() => {
    if (open) {
      if (!isEditing) loadOrganizations();
      getContacts(companyId, { pageSize: 500 }).then((r) => {
        if (r.success && r.data) {
          setContacts(r.data.contacts.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name })));
        }
      });
    }
  }, [open, isEditing, companyId]);

  const loadOrganizations = async () => {
    const result = await getAllOrganizations(companyId);
    if (result.success && result.data) {
      setOrganizations(result.data);
    }
  };

  // Reset form when dialog opens/closes or contact changes
  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email || '',
          phone: contact.phone || '',
          title: contact.title || '',
          credentials: contact.credentials || '',
          license_number: contact.license_number || '',
          primary_specialty: contact.primary_specialty || '',
          profile_image_url: contact.profile_image_url || '',
          status: contact.status,
          notes: contact.notes || '',
        });
        setUploadedImageUrl(contact.profile_image_url || '');
        setSelectedManagerId((contact as any).manager_id || '');
        // Load existing address if editing
        loadExistingAddress(contact.id);
      } else {
        reset({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          title: '',
          credentials: '',
          license_number: '',
          primary_specialty: '',
          profile_image_url: '',
          status: 'active',
          notes: '',
        });
        setUploadedImageUrl('');
        setAddressData(emptyAddress);
        setExistingAddressId(null);
        setSelectedOrgId('');
        setSelectedRole('other');
        setSelectedManagerId('');
      }
    }
  }, [open, contact, reset]);

  const loadExistingAddress = async (contactId: string) => {
    const result = await getAddressesByEntity('contact', contactId);
    if (result.success && result.data && result.data.length > 0) {
      const addr = result.data[0];
      setExistingAddressId(addr.id);
      setAddressData({
        address_type: addr.address_type,
        street_1: addr.street_1 || '',
        street_2: addr.street_2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postal_code: addr.postal_code || '',
        country: addr.country || 'United States',
        is_primary: addr.is_primary,
      });
    } else {
      setAddressData(emptyAddress);
      setExistingAddressId(null);
    }
  };

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      let result;
      let contactId: string;

      if (isEditing && contact) {
        result = await updateContact({
          id: contact.id,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
          credentials: values.credentials || null,
          license_number: values.license_number || null,
          ...(userRole === 'admin' && { primary_specialty: values.primary_specialty || null }),
          profile_image_url: uploadedImageUrl || null,
          status: values.status as EntityStatus,
          notes: values.notes || null,
          manager_id: selectedManagerId || null,
        });
        contactId = contact.id;
      } else {
        result = await createContact(companyId, profileId, userEmail, {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
          credentials: values.credentials || null,
          license_number: values.license_number || null,
          ...(userRole === 'admin' && { primary_specialty: values.primary_specialty || null }),
          profile_image_url: uploadedImageUrl || null,
          status: values.status as EntityStatus,
          notes: values.notes || null,
          manager_id: selectedManagerId || null,
        });
        contactId = result.data?.id || '';
      }

      if (result.success) {
        // Handle address creation/update
        if (hasAddressData(addressData) && contactId) {
          if (existingAddressId) {
            await updateAddress({
              id: existingAddressId,
              ...addressData,
            });
          } else {
            await createAddress({
              entity_type: 'contact',
              entity_id: contactId,
              ...addressData,
            });
          }
        }

        // Handle organization assignment (only for new contacts)
        if (!isEditing && selectedOrgId && contactId) {
          await assignContactToOrganization({
            contact_id: contactId,
            organization_id: selectedOrgId,
            role: selectedRole,
            is_primary: false,
            status: 'active',
          });
        }

        toast({
          title: isEditing ? 'Contact updated' : 'Contact created',
          description: `${values.first_name} ${values.last_name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEditing ? 'update' : 'create'} contact`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xs">
            {isEditing ? 'Edit Contact' : 'New Contact'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the contact details below.'
              : 'Add a new contact to your contacts database.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="first_name" className="text-xs">First Name *</Label>
              <Input
                id="first_name"
                placeholder="John"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('first_name')}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="last_name" className="text-xs">Last Name *</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('last_name')}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs">Title</Label>
              <Select
                value={watch('title') || ''}
                onValueChange={(v) => setValue('title', v ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="title" className="text-xs h-8">
                  <SelectValue placeholder="Principal Investigator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">
                    —
                  </SelectItem>
                  {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                  {(() => {
                    const title = watch('title');
                    return title && !(title in CONTACT_ROLE_LABELS) ? (
                      <SelectItem value={title} className="text-xs">
                        {title}
                      </SelectItem>
                    ) : null;
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="credentials" className="text-xs">Credentials</Label>
              <Input
                id="credentials"
                placeholder="MD, PhD"
                className="text-xs md:text-xs h-8"
                {...register('credentials')}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                value={watch('phone') || ''}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setValue('phone', formatted, { shouldValidate: true });
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="license_number" className="text-xs">License Number</Label>
              <Input
                id="license_number"
                placeholder="Medical license #"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('license_number')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="primary_specialty" className="text-xs">
                Primary Specialty
                {userRole !== 'admin' && contact?.primary_specialty && (
                  <span className="text-muted-foreground font-normal ml-1">(admin-only to edit)</span>
                )}
              </Label>
              <Input
                id="primary_specialty"
                placeholder="e.g. Cardiology, Neurology"
                className="text-xs placeholder:text-xs md:text-xs h-8"
                {...register('primary_specialty')}
                readOnly={userRole !== 'admin'}
                disabled={userRole !== 'admin'}
              />
            </div>

            {isEditing && contacts.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="manager" className="text-xs">Reports To (Manager)</Label>
                <Select
                  value={selectedManagerId}
                  onValueChange={(v) => setSelectedManagerId(v || '')}
                >
                  <SelectTrigger className="text-xs h-8 w-full">
                    <SelectValue placeholder="No manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs">None</SelectItem>
                    {contacts
                      .filter((c) => c.id !== contact?.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => value && setValue('status', value as EntityStatus)}
              >
                <SelectTrigger className="text-xs h-8 w-full">
                  <span className="text-xs capitalize">
                    {selectedStatus ? ENTITY_STATUS_LABELS[selectedStatus as EntityStatus] || formatFieldName(selectedStatus) : 'Select status'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Profile Image Upload */}
          <div className="space-y-1">
            <Label className="text-xs">Profile Image</Label>
            <ContactImageUpload
              currentImageUrl={uploadedImageUrl || contact?.profile_image_url}
              contactId={contact?.id || 'temp-' + Date.now()}
              onUploadComplete={(url) => {
                setUploadedImageUrl(url);
                setValue('profile_image_url', url);
              }}
              onUploadError={(error) => {
                toast({
                  title: 'Upload Error',
                  description: error,
                  variant: 'destructive',
                });
              }}
            />
          </div>

          {/* Organization Assignment (only for new contacts) */}
          {!isEditing && organizations.length > 0 && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <Label className="text-xs font-medium">Assign to Organization (Optional)</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="organization" className="text-xs">Organization</Label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={(v) => setSelectedOrgId(v || '')}
                  >
                    <SelectTrigger className="text-xs h-8 w-full">
                      <span className="capitalize">
                        {selectedOrgDisplay 
                          ? `${selectedOrgDisplay.name} (${ORGANIZATION_TYPE_LABELS[selectedOrgDisplay.organization_type]})`
                          : 'Select organization'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">None</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id} className="text-xs">
                          {org.name} ({ORGANIZATION_TYPE_LABELS[org.organization_type]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrgId && (
                  <div className="space-y-1">
                    <Label htmlFor="role" className="text-xs">Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(v) => v && setSelectedRole(v as ContactRole)}
                    >
                      <SelectTrigger className="text-xs h-8 w-full">
                        <span className="text-xs capitalize">
                          {selectedRole ? CONTACT_ROLE_LABELS[selectedRole] || formatFieldName(selectedRole) : 'Select role'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address Section */}
          <AddressForm
            value={addressData}
            onChange={setAddressData}
            defaultOpen={isEditing && hasAddressData(addressData)}
          />

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this contact..."
              className="resize-none text-xs md:text-xs placeholder:text-xs"
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Contact' : 'Create Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
