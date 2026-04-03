'use client';

import { useState, useCallback, useTransition } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  COUNTRY_STATUS_OPTIONS,
  REGULATORY_STATUS_OPTIONS,
  type StudyCountryWithSubmissions,
  type RegulatorySubmission,
} from '@/lib/types/ctms';
import {
  getStudyCountries,
  removeStudyCountry,
  deleteSubmission,
} from '@/lib/actions/countries';

import { CountryFormDialog } from './country-form-dialog';
import { SubmissionFormDialog } from './submission-form-dialog';

const submissionTypeLabel: Record<string, string> = {
  IRB: 'IRB',
  EC: 'Ethics Committee',
  import_license: 'Import License',
  regulatory_approval: 'Regulatory Approval',
};

interface CountriesTabProps {
  studyId: string;
  initialCountries: StudyCountryWithSubmissions[];
}

export function CountriesTab({ studyId, initialCountries }: CountriesTabProps) {
  const [countries, setCountries] = useState(initialCountries);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const refreshCountries = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudyCountries(studyId);
        setCountries(data);
      } catch {
        toast.error('Failed to refresh country data');
      }
    });
  }, [studyId]);

  const toggleExpand = (countryId: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const handleRemoveCountry = async (id: string) => {
    const { error } = await removeStudyCountry(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Country removed');
    refreshCountries();
  };

  const handleDeleteSubmission = async (id: string) => {
    const { error } = await deleteSubmission(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Submission deleted');
    refreshCountries();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const existingCodes = countries.map((c) => c.country_code);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Countries</h3>
          <p className="text-sm text-muted-foreground">
            Manage country participation and regulatory submissions for this study.
          </p>
        </div>
        <CountryFormDialog
          studyId={studyId}
          existingCodes={existingCodes}
          onSuccess={refreshCountries}
        />
      </div>

      {countries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No countries added</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add countries to track regulatory submissions and site participation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {countries.map((country) => {
            const isExpanded = expandedCountries.has(country.id);
            const submissions = country.regulatory_submissions ?? [];

            return (
              <Card key={country.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleExpand(country.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {country.country_name}{' '}
                          <span className="text-muted-foreground font-normal">
                            ({country.country_code})
                          </span>
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="shrink-0 text-muted-foreground">Participation:</span>
                            <StatusBadge
                              status={country.status}
                              className="text-xs"
                              label={
                                COUNTRY_STATUS_OPTIONS.find((o) => o.value === country.status)?.label ??
                                country.status
                              }
                            />
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="shrink-0 text-muted-foreground">Regulatory:</span>
                            <StatusBadge
                              status={country.regulatory_status}
                              className="text-xs"
                              label={
                                REGULATORY_STATUS_OPTIONS.find((o) => o.value === country.regulatory_status)
                                  ?.label ?? country.regulatory_status
                              }
                            />
                          </span>
                          {submissions.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CountryFormDialog
                        studyId={studyId}
                        existingCodes={existingCodes}
                        country={country}
                        onSuccess={refreshCountries}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Country</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {country.country_name} and all associated
                              regulatory submissions from this study. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveCountry(country.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Regulatory Submissions</h4>
                        </div>
                        <SubmissionFormDialog
                          studyId={studyId}
                          studyCountryId={country.id}
                          onSuccess={refreshCountries}
                        />
                      </div>

                      {submissions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          No regulatory submissions recorded for this country.
                        </p>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Submission Date</TableHead>
                                <TableHead className="text-xs">Approval Date</TableHead>
                                <TableHead className="text-xs">Expiry Date</TableHead>
                                <TableHead className="text-xs">Reference</TableHead>
                                <TableHead className="text-xs w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {submissions.map((sub) => (
                                <SubmissionRow
                                  key={sub.id}
                                  submission={sub}
                                  studyId={studyId}
                                  studyCountryId={country.id}
                                  formatDate={formatDate}
                                  onDelete={handleDeleteSubmission}
                                  onSuccess={refreshCountries}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  studyId,
  studyCountryId,
  formatDate,
  onDelete,
  onSuccess,
}: {
  submission: RegulatorySubmission;
  studyId: string;
  studyCountryId: string;
  formatDate: (d: string | null) => string;
  onDelete: (id: string) => void;
  onSuccess: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="text-xs font-medium">
        {submissionTypeLabel[submission.submission_type] ?? submission.submission_type}
      </TableCell>
      <TableCell>
        <StatusBadge status={submission.status} className="text-xs" />
      </TableCell>
      <TableCell className="text-xs">{formatDate(submission.submission_date)}</TableCell>
      <TableCell className="text-xs">{formatDate(submission.approval_date)}</TableCell>
      <TableCell className="text-xs">{formatDate(submission.expiry_date)}</TableCell>
      <TableCell className="text-xs truncate max-w-[120px]">
        {submission.reference_number || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <SubmissionFormDialog
            studyId={studyId}
            studyCountryId={studyCountryId}
            submission={submission}
            onSuccess={onSuccess}
          />
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this{' '}
                  {submissionTypeLabel[submission.submission_type]} submission. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(submission.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
