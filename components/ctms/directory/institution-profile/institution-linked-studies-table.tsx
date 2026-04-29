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

import {
  getInstitutionStudyRelationshipLabel,
  type NormalizedLinkedStudy,
  type ProfileCopy,
} from './utils';

export interface InstitutionLinkedStudiesTableProps {
  copy: ProfileCopy;
  studies: NormalizedLinkedStudy[];
  canEdit: boolean;
  /** False when there are no studies in the workspace to link to. */
  canLinkStudy: boolean;
  onLinkStudy: () => void;
  onRemoveLink: (linkId: string) => void;
}

export function InstitutionLinkedStudiesTable({
  copy,
  studies,
  canEdit,
  canLinkStudy,
  onLinkStudy,
  onRemoveLink,
}: InstitutionLinkedStudiesTableProps) {
  const rows = studies ?? [];

  return (
    <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
        <h2 id="directory-linked-studies-heading" className="text-sm font-semibold tracking-tight leading-none">
          {copy.linkedStudiesHeading}
        </h2>
        {canEdit && canLinkStudy ? (
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onLinkStudy}>
            Link study
          </Button>
        ) : null}
      </div>
      <Table aria-labelledby="directory-linked-studies-heading">
        <TableCaption className="sr-only">
          Studies linked to this {copy.entityNoun.toLowerCase()}
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
              Study
            </TableHead>
            <TableHead scope="col" className="text-[11px] uppercase tracking-wide">
              Relationship
            </TableHead>
            {canEdit ? (
              <TableHead scope="col" className="w-[1%] text-[11px] uppercase tracking-wide">
                <span className="sr-only">Actions</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={canEdit ? 3 : 2}
                className="py-8 text-center text-xs text-muted-foreground"
              >
                No studies linked.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.linkId}>
                <TableCell>
                  <Link
                    href={`/protected/studies/${s.studyId}`}
                    className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {s.label}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getInstitutionStudyRelationshipLabel(s.relationshipType)}
                </TableCell>
                {canEdit ? (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveLink(s.linkId)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
