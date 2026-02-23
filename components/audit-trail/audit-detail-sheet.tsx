'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AuditLogEntry } from '@/lib/types/audit-trail';
import { AUDIT_ACTION_LABELS, AUDITED_TABLE_LABELS } from '@/lib/types/audit-trail';

interface AuditDetailSheetProps {
  entry: AuditLogEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailSheet({ entry, open, onOpenChange }: AuditDetailSheetProps) {
  const performerName = entry.performed_by?.first_name || entry.performed_by?.last_name
    ? `${entry.performed_by.first_name || ''} ${entry.performed_by.last_name || ''}`.trim()
    : entry.performed_by_email || 'System';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">Audit Log Detail</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Action</p>
              <Badge variant={entry.action === 'DELETE' ? 'destructive' : entry.action === 'INSERT' ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                {AUDIT_ACTION_LABELS[entry.action]}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Table</p>
              <p className="text-sm">{AUDITED_TABLE_LABELS[entry.table_name] || entry.table_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Performed By</p>
              <p className="text-sm">{performerName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Timestamp</p>
              <p className="text-sm">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Record ID</p>
              <p className="text-xs font-mono break-all">{entry.record_id}</p>
            </div>
          </div>

          {entry.changed_fields && Object.keys(entry.changed_fields).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Changed Fields</p>
                <div className="space-y-2">
                  {Object.entries(entry.changed_fields).map(([field, values]) => (
                    <div key={field} className="rounded border p-2">
                      <p className="text-xs font-medium">{field}</p>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Before</p>
                          <p className="text-xs font-mono bg-red-50 text-red-700 p-1 rounded break-all">
                            {JSON.stringify(values.old, null, 2) ?? 'null'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">After</p>
                          <p className="text-xs font-mono bg-green-50 text-green-700 p-1 rounded break-all">
                            {JSON.stringify(values.new, null, 2) ?? 'null'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {entry.action === 'INSERT' && entry.new_data && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Created Record Data</p>
                <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[300px]">
                  {JSON.stringify(entry.new_data, null, 2)}
                </pre>
              </div>
            </>
          )}

          {entry.action === 'DELETE' && entry.old_data && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Deleted Record Data</p>
                <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[300px]">
                  {JSON.stringify(entry.old_data, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
