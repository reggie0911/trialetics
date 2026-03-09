'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, User, Building2, FolderOpen, Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteContact } from '@/lib/actions/contacts';
import {
  ContactWithRelations,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';
import { formatFieldName, formatPhoneNumber } from '@/lib/utils';
import { exportToCSV, printTable } from '@/lib/utils/table-export';

interface ContactsDataTableProps {
  contacts: ContactWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (contact: ContactWithRelations) => void;
  onEdit: (contact: ContactWithRelations) => void;
  onRefresh: () => void;
}

export function ContactsDataTable({
  contacts,
  total,
  page,
  pageSize,
  onPageChange,
  onView,
  onEdit,
  onRefresh,
}: ContactsDataTableProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactWithRelations | null>(null);

  const handleDelete = async () => {
    if (!contactToDelete) return;

    const result = await deleteContact(contactToDelete.id);
    if (result.success) {
      toast({
        title: 'Contact archived',
        description: `${contactToDelete.first_name} ${contactToDelete.last_name} has been archived successfully.`,
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to archive contact',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const columns: ColumnDef<ContactWithRelations>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <User className="h-3 w-3 text-muted-foreground" />
          <div>
            <span className="font-medium">
              {row.original.first_name} {row.original.last_name}
            </span>
            {row.original.credentials && (
              <span className="text-muted-foreground ml-1">
                , {row.original.credentials}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="text-xs">{row.getValue('title') || '—'}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-xs">{row.getValue('email') || '—'}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null | undefined;
        return (
          <span className="text-xs">
            {phone ? formatPhoneNumber(phone) : '—'}
          </span>
        );
      },
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => {
        const org = row.original.primary_organization;
        return org ? (
          <div className="flex items-center gap-1 text-xs">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span>{org.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {ENTITY_STATUS_LABELS[status as keyof typeof ENTITY_STATUS_LABELS] || formatFieldName(status)}
          </Badge>
        );
      },
    },
    {
      id: 'projects',
      header: 'Projects',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs">
          <FolderOpen className="h-3 w-3 text-muted-foreground" />
          <span>{row.original.projects_count || 0}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(contact)} className="text-xs">
                <Eye className="mr-2 h-3 w-3" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(contact)} className="text-xs">
                <Pencil className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-xs"
                onClick={() => {
                  setContactToDelete(contact);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const totalPages = Math.ceil(total / pageSize);

  const handleExportCSV = () => {
    try {
      // Create simplified columns for CSV export
      const csvColumns = [
        { header: 'Name', getValue: (c: ContactWithRelations) => `${c.first_name} ${c.last_name}${c.credentials ? `, ${c.credentials}` : ''}` },
        { header: 'Title', getValue: (c: ContactWithRelations) => (c as any).displayTitle || c.title || '' },
        { header: 'Email', getValue: (c: ContactWithRelations) => c.email || '' },
        { header: 'Phone', getValue: (c: ContactWithRelations) => c.phone || '' },
        { header: 'Organization', getValue: (c: ContactWithRelations) => c.primary_organization?.name || '' },
        { header: 'Status', getValue: (c: ContactWithRelations) => ENTITY_STATUS_LABELS[c.status] || formatFieldName(c.status) },
        { header: 'Projects', getValue: (c: ContactWithRelations) => String(c.projects_count || 0) },
      ];

      const headers = csvColumns.map(col => col.header);
      const rows = contacts.map(contact => 
        csvColumns.map(col => col.getValue(contact))
      );

      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => {
            const cellStr = String(cell ?? '').replace(/"/g, '""');
            return `"${cellStr}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export successful',
        description: 'Contacts data has been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export contacts data.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      toast({
        title: 'Print failed',
        description: 'Failed to print page.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Export and Print Buttons */}
      {contacts.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-7"
          >
            <Download className="h-3 w-3 mr-1" />
            Download CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-7"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted/50 text-xs font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onView(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => {
                      if (cell.column.id === 'actions') {
                        e.stopPropagation();
                      }
                    }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <User className="h-8 w-8" />
                    <p className="text-xs">No contacts found.</p>
                    <p className="text-xs">Add your first contact to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} contacts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="text-xs h-7"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-xs h-7"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Archive Contact?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will archive &quot;{contactToDelete?.first_name} {contactToDelete?.last_name}&quot; and mark them as inactive.
              The contact can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="text-xs">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
