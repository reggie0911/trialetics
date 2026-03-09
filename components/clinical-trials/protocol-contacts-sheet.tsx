'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Building2, BarChart3, ExternalLink } from 'lucide-react';
import { getProtocolContacts } from '@/lib/actions/protocol-contacts';
import { getAccountAssociations } from '@/lib/actions/account-associations';
import { getProtocolInstitutions } from '@/lib/actions/organizations';
import type { ProtocolContactWithRelations } from '@/lib/actions/protocol-contacts';
import { CONTACT_ROLE_LABELS, CONTACT_PROJECT_ROLE_LABELS, ORGANIZATION_PROJECT_ROLE_LABELS } from '@/lib/types/contacts-organizations';
import { ACCOUNT_TYPE_LABELS } from '@/lib/types/clinical-trials';
import { ProtocolContactAssignDialog } from './protocol-contact-assign-dialog';

interface ProtocolContactsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  protocolNumber: string;
  protocolTitle: string;
  companyId: string;
  onSuccess?: () => void;
}

export function ProtocolContactsSheet({
  open,
  onOpenChange,
  protocolId,
  protocolNumber,
  protocolTitle,
  companyId,
  onSuccess,
}: ProtocolContactsSheetProps) {
  const [contacts, setContacts] = useState<ProtocolContactWithRelations[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignContact, setShowAssignContact] = useState(false);

  const loadData = async () => {
    if (!protocolId) return;
    setIsLoading(true);
    const [contactsRes, institutionsRes] = await Promise.all([
      getProtocolContacts(protocolId),
      getProtocolInstitutions(protocolId),
    ]);
    if (contactsRes.success && contactsRes.data) setContacts(contactsRes.data);
    if (institutionsRes.success && institutionsRes.data) setInstitutions(institutionsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open && protocolId) loadData();
  }, [open, protocolId]);

  const handleSuccess = () => {
    loadData();
    onSuccess?.();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {protocolNumber} - {protocolTitle}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Contacts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts & Partners
                </h3>
                <Button size="sm" variant="outline" onClick={() => setShowAssignContact(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((pc) => (
                    <div
                      key={pc.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <div>
                        {pc.contact?.id ? (
                          <Link
                            href={`/protected/contacts-organizations/contacts/${pc.contact.id}`}
                            className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {pc.contact.first_name} {pc.contact.last_name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <p className="font-medium">
                            {pc.contact?.first_name} {pc.contact?.last_name}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {(CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[pc.role] ?? CONTACT_ROLE_LABELS[pc.role as keyof typeof CONTACT_ROLE_LABELS] ?? pc.role}
                          {pc.contact?.email && ` · ${pc.contact.email}`}
                        </p>
                      </div>
                      <Badge variant={pc.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {pc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No protocol contacts assigned</p>
              )}
            </div>

            {/* Trackers - CTMS navigation to trackers */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4" />
                View in Trackers
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'AE Metrics', href: '/protected/ae' },
                  { label: 'eCRF Query', href: '/protected/ecrf-query-tracker' },
                  { label: 'SDV Tracker', href: '/protected/sdv-tracker' },
                  { label: 'Visit Window', href: '/protected/vw' },
                  { label: 'Med Compliance', href: '/protected/mc' },
                  { label: 'Patients', href: '/protected/patients' },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={`${href}?protocol=${protocolId}`}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Study Institutions */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                Study Institutions
              </h3>
              {institutions.length > 0 ? (
                <div className="space-y-2">
                  {institutions.map((inst: any) => (
                    <div
                      key={inst.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        {inst.organization?.id ? (
                          <Link
                            href={`/protected/contacts-organizations/${inst.organization.id}`}
                            className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {inst.organization.name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <p className="font-medium">{inst.organization?.name ?? '—'}</p>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {(ORGANIZATION_PROJECT_ROLE_LABELS as Record<string, string>)[inst.role] ?? inst.role}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        {inst.account_type && (
                          <span>{ACCOUNT_TYPE_LABELS[inst.account_type as keyof typeof ACCOUNT_TYPE_LABELS] ?? inst.account_type}</span>
                        )}
                        {inst.is_central && <Badge variant="secondary" className="text-[10px] px-1">Central</Badge>}
                        {inst.institution_classification && (
                          <span className="capitalize">Classification: {inst.institution_classification}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No institutions assigned</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ProtocolContactAssignDialog
        open={showAssignContact}
        onOpenChange={setShowAssignContact}
        protocolId={protocolId}
        companyId={companyId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
