'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { NormalizedContact, ProfileCopy } from './utils';

export interface InstitutionPeopleTableProps {
  copy: ProfileCopy;
  institutionId: string;
  contacts: NormalizedContact[];
}

export function InstitutionPeopleTable({ copy, institutionId, contacts }: InstitutionPeopleTableProps) {
  const safeContacts = contacts ?? [];

  return (
    <div className="space-y-2">
      <h2 id="directory-people-heading" className="text-sm font-semibold tracking-tight">
        {copy.contactsHeading}
      </h2>
      <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
        <Table aria-labelledby="directory-people-heading">
          <TableCaption className="sr-only">
            People associated with this {copy.entityNoun.toLowerCase()}
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
                Name
              </TableHead>
              <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
                Role
              </TableHead>
              <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
                Contact
              </TableHead>
              <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
                Primary
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeContacts.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  No people linked yet.
                </TableCell>
              </TableRow>
            ) : (
              safeContacts.map((c) => {
                const displayName =
                  [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—';
                const contactHref =
                  c.contactId != null
                    ? `/protected/directory/contacts/${c.contactId}?fromInstitution=${encodeURIComponent(institutionId)}`
                    : null;

                return (
                  <TableRow key={c.linkId}>
                    <TableCell className="font-medium">
                      {contactHref ? (
                        <Link
                          href={contactHref}
                          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <span>{displayName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.roleName ?? c.title ?? '—'}
                    </TableCell>
                    <TableCell>
                      <ContactCell email={c.email} phone={c.phone} />
                    </TableCell>
                    <TableCell>{c.isPrimary ? 'Yes' : '—'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="border-t border-border/60 px-4 py-3 text-[11px] text-muted-foreground">
          <p>{copy.contactsSubtitle}</p>
          <Button variant="link" size="sm" className="h-auto px-0 pt-1 text-[11px]" asChild>
            <Link href="/protected/directory">Open Directory</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContactCell({ email, phone }: { email: string | null; phone: string | null }) {
  if (email) {
    return (
      <a
        href={`mailto:${email}`}
        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {email}
      </a>
    );
  }
  if (phone) {
    const tel = phone.replace(/\s+/g, '');
    return (
      <a
        href={`tel:${tel}`}
        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {phone}
      </a>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}
