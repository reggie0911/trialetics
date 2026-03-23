'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { EtmfDocument, EtmfAuditLog } from '@/lib/types/etmf';
import { format } from 'date-fns';

interface DocumentDetailsPanelProps {
  document: EtmfDocument;
  auditLog: EtmfAuditLog[];
}

export function DocumentDetailsPanel({ document, auditLog }: DocumentDetailsPanelProps) {
  return (
    <Tabs defaultValue="details" className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="details"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
        >
          Details
        </TabsTrigger>
        <TabsTrigger
          value="quality"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
        >
          Quality Control
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="flex-1 overflow-y-auto p-4 m-0">
        <DetailsTab document={document} />
      </TabsContent>

      <TabsContent value="quality" className="flex-1 overflow-y-auto p-4 m-0">
        <QualityControlTab auditLog={auditLog} />
      </TabsContent>
    </Tabs>
  );
}

function DetailsTab({ document }: { document: EtmfDocument }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-primary mb-3">Document Information</h3>
        <div className="space-y-2 text-xs">
          <DetailRow label="Document ID" value={`D-${document.id.slice(0, 12)}`} />
          <DetailRow label="Document Name" value={document.document_name} />
          <DetailRow label="Document Version" value={document.version} />
          <DetailRow label="Zone Name" value={document.tmf_reference?.zone_name} />
          <DetailRow label="Section Name" value={document.tmf_reference?.section_name} />
          <DetailRow label="Sub-Artifact" value={document.tmf_reference?.recommended_sub_artifact} />
          <DetailRow label="Country Region" value={document.study_country?.country_name} />
          <DetailRow label="Site Name" value={document.site?.name} />
          <DetailRow
            label="Document Staff Name"
            value={
              document.staff_member
                ? [
                    document.staff_member.profile?.first_name,
                    document.staff_member.profile?.last_name,
                  ]
                    .filter(Boolean)
                    .join(' ') || document.staff_member.profile?.email
                : undefined
            }
          />
          <DetailRow label="Document Staff Role" value={document.staff_member?.role?.replace(/_/g, ' ')} />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium text-primary mb-3">File Properties</h3>
        <div className="space-y-2 text-xs">
          <DetailRow label="Content Identifier" value={document.file_name} />
          <DetailRow
            label="Created"
            value={document.created_at ? format(new Date(document.created_at), 'dd-MMM-yyyy') : undefined}
          />
          <DetailRow label="Format" value={document.file_format} />
          <DetailRow
            label="File Size"
            value={document.file_size_bytes ? `${(document.file_size_bytes / 1024).toFixed(0)} Kb` : undefined}
          />
          <DetailRow label="Dating Convention" value={document.tmf_reference?.dating_convention} />
          <DetailRow label="Language" value={document.language} />
          <DetailRow label="Expected Document List" value={document.tmf_reference ? 'Yes' : 'No'} />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium text-primary mb-3">TMF Compliance</h3>
        <div className="space-y-2 text-xs">
          <DetailRow
            label="Placeholder Date"
            value={document.created_at ? format(new Date(document.created_at), 'dd-MMM-yyyy') : undefined}
          />
          <DetailRow label="Placeholder Creator" value={document.submitter ? `${document.submitter.first_name} ${document.submitter.last_name}` : undefined} />
          <DetailRow
            label="Initial Submission"
            value={document.initial_submission_date ? format(new Date(document.initial_submission_date), 'dd-MMM-yyyy') : undefined}
          />
          <DetailRow
            label="QC Review Date"
            value={document.qc_review_date ? format(new Date(document.qc_review_date), 'dd-MMM-yyyy') : undefined}
          />
          <DetailRow
            label="Submitter Name"
            value={document.submitter ? `${document.submitter.first_name} ${document.submitter.last_name}` : undefined}
          />
        </div>
      </section>
    </div>
  );
}

function QualityControlTab({ auditLog }: { auditLog: EtmfAuditLog[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-primary">Audit Trail</h3>

      {auditLog.length === 0 ? (
        <p className="text-xs text-muted-foreground">No audit history yet.</p>
      ) : (
        <div className="space-y-3">
          {auditLog.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                <span className="text-muted-foreground">
                  {format(new Date(entry.performed_at), 'dd-MMM-yyyy HH:mm')}
                </span>
              </div>
              {entry.performer && (
                <p className="text-muted-foreground">
                  By: {entry.performer.first_name} {entry.performer.last_name}
                </p>
              )}
              {entry.action === 'status_change' && entry.new_values && (
                <p className="mt-1">
                  Status changed to:{' '}
                  <span className="font-medium capitalize">
                    {String((entry.new_values as any).document_status || '').replace('_', ' ')}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex">
      <span className="w-40 text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}
