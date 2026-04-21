'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import {
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';

import { CountryFormDialog } from './country-form-dialog';
import { SubmissionFormDialog } from './submission-form-dialog';

const submissionTypeLabel: Record<string, string> = {
  IRB: 'IRB',
  EC: 'Ethics Committee',
  import_license: 'Import License',
  regulatory_approval: 'Regulatory Approval',
};

const COUNTRY_TABLE_COL_COUNT = 6;

interface CountriesTabProps {
  studyId: string;
  initialCountries: StudyCountryWithSubmissions[];
}

export function CountriesTab({ studyId, initialCountries }: CountriesTabProps) {
  const studyHub = useStudyHub();
  const readOnly = studyHub?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;

  const [countries, setCountries] = useState(initialCountries);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

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

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.country_name.toLowerCase().includes(q) ||
        c.country_code.toLowerCase().includes(q),
    );
  }, [countries, searchQuery]);

  const pagination = useClientPagination({
    totalItems: filteredCountries.length,
    resetKey: [searchQuery],
  });
  const paginatedCountries = pagination.paginate(filteredCountries);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto">
          <CountryFormDialog
            studyId={studyId}
            existingCodes={existingCodes}
            onSuccess={refreshCountries}
            disabled={readOnly}
            disabledTooltip={disabledTooltip}
          />
        </div>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead className="text-xs">Country</TableHead>
                <TableHead className="text-xs">Participation</TableHead>
                <TableHead className="text-xs">Regulatory</TableHead>
                <TableHead className="text-xs w-[110px]">Submissions</TableHead>
                <TableHead className="text-xs w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCountries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COUNTRY_TABLE_COL_COUNT}
                    className="text-xs text-muted-foreground text-center py-6"
                  >
                    No countries match your search.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCountries.map((country) => {
                  const isExpanded = expandedCountries.has(country.id);
                  const submissions = country.regulatory_submissions ?? [];

                  return (
                    <CountryRows
                      key={country.id}
                      country={country}
                      submissions={submissions}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(country.id)}
                      studyId={studyId}
                      existingCodes={existingCodes}
                      readOnly={readOnly}
                      disabledTooltip={disabledTooltip}
                      formatDate={formatDate}
                      onRemoveCountry={handleRemoveCountry}
                      onDeleteSubmission={handleDeleteSubmission}
                      onRefresh={refreshCountries}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {countries.length > 0 && (
        <TablePaginationFooter
          pagination={pagination}
          totalItems={filteredCountries.length}
          itemNoun="country"
          itemNounPlural="countries"
        />
      )}
    </div>
  );
}

function CountryRows({
  country,
  submissions,
  isExpanded,
  onToggle,
  studyId,
  existingCodes,
  readOnly,
  disabledTooltip,
  formatDate,
  onRemoveCountry,
  onDeleteSubmission,
  onRefresh,
}: {
  country: StudyCountryWithSubmissions;
  submissions: RegulatorySubmission[];
  isExpanded: boolean;
  onToggle: () => void;
  studyId: string;
  existingCodes: string[];
  readOnly: boolean;
  disabledTooltip: string | undefined;
  formatDate: (d: string | null) => string;
  onRemoveCountry: (id: string) => void;
  onDeleteSubmission: (id: string) => void;
  onRefresh: () => void;
}) {
  const participationLabel =
    COUNTRY_STATUS_OPTIONS.find((o) => o.value === country.status)?.label ?? country.status;
  const regulatoryLabel =
    REGULATORY_STATUS_OPTIONS.find((o) => o.value === country.regulatory_status)?.label ??
    country.regulatory_status;

  return (
    <>
      <TableRow>
        <TableCell className="py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse country' : 'Expand country'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="text-xs font-medium">
          {country.country_name}
          <span className="text-muted-foreground font-normal">
            {' '}
            ({country.country_code})
          </span>
        </TableCell>
        <TableCell>
          <StatusBadge
            status={country.status}
            className="text-xs"
            label={participationLabel}
          />
        </TableCell>
        <TableCell>
          <StatusBadge
            status={country.regulatory_status}
            className="text-xs"
            label={regulatoryLabel}
          />
        </TableCell>
        <TableCell className="text-xs">
          {submissions.length === 0 ? (
            <span className="text-muted-foreground">0</span>
          ) : (
            submissions.length
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <CountryFormDialog
              studyId={studyId}
              existingCodes={existingCodes}
              country={country}
              onSuccess={onRefresh}
              disabled={readOnly}
              disabledTooltip={disabledTooltip}
            />
            {readOnly ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled
                    aria-label="Remove country"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Country</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {country.country_name} and all associated regulatory
                      submissions from this study. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onRemoveCountry(country.id)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COUNTRY_TABLE_COL_COUNT} className="py-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Regulatory submissions</h4>
                </div>
                <SubmissionFormDialog
                  studyId={studyId}
                  studyCountryId={country.id}
                  onSuccess={onRefresh}
                  disabled={readOnly}
                  disabledTooltip={disabledTooltip}
                />
              </div>

              {submissions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No regulatory submissions recorded for this country.
                </p>
              ) : (
                <div className="rounded-md border bg-background">
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
                          onDelete={onDeleteSubmission}
                          onSuccess={onRefresh}
                          readOnly={readOnly}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SubmissionRow({
  submission,
  studyId,
  studyCountryId,
  formatDate,
  onDelete,
  onSuccess,
  readOnly,
}: {
  submission: RegulatorySubmission;
  studyId: string;
  studyCountryId: string;
  formatDate: (d: string | null) => string;
  onDelete: (id: string) => void;
  onSuccess: () => void;
  readOnly: boolean;
}) {
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
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
            disabled={readOnly}
            disabledTooltip={disabledTooltip}
          />
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled
                  aria-label="Delete submission"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
