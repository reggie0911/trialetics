'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  CSVRow,
  OrganizationCSVRow,
  ContactCSVRow,
  DedupedContact,
  ValidationResult,
  BulkImportResult,
} from '@/lib/types/contacts-organizations-csv';
import {
  validateCSVData,
} from '@/lib/utils/contacts-organizations-csv-validator';
import {
  importOrganizationChunk,
  importContactChunk,
  buildOrgResolutionMaps,
  revalidateContactsOrganizations,
} from '@/lib/actions/bulk-import';
import {
  generateOrganizationCSVTemplate,
  generateContactCSVTemplate,
} from '@/lib/utils/csv-template-generator';

const CHUNK_SIZE = 25;

interface BulkUploadDialogProps {
  companyId: string;
  profileId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export function BulkUploadDialog({
  companyId,
  profileId,
  userEmail,
  onSuccess,
}: BulkUploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewData, setPreviewData] = useState<{
    organizations: OrganizationCSVRow[];
    contacts: ContactCSVRow[];
  }>({ organizations: [], contacts: [] });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setValidationResult(null);
    parseCSV(selectedFile);
  };

  const parseCSV = (csvFile: File) => {
    setParsing(true);
    setError(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      newline: '\n',
      complete: (results) => {
        setParsing(false);

        const criticalErrors = results.errors.filter(
          (error) => error.type !== 'Delimiter' && error.type !== 'Quotes'
        );

        if (criticalErrors.length > 0) {
          setError(`CSV parsing errors: ${criticalErrors[0].message}`);
          return;
        }

        const csvData = results.data as CSVRow[];

        if (!csvData || csvData.length === 0) {
          setError('CSV file has no data rows');
          return;
        }

        try {
          const csvHeaders = results.meta.fields || [];
          const validation = validateCSVData(csvData, csvHeaders);

          setValidationResult(validation);

          const validOrgs = validation.organizations
            .filter((r) => r.data !== null)
            .slice(0, 5)
            .map((r) => r.data!);
          const validContacts = validation.contacts
            .filter((r) => r.data !== null)
            .slice(0, 5)
            .map((r) => r.data!);

          setPreviewData({
            organizations: validOrgs,
            contacts: validContacts,
          });

          if (validation.invalidRows > 0) {
            const errorCount = validation.organizations.filter((r) => r.errors.length > 0).length +
              validation.contacts.filter((r) => r.errors.length > 0).length;
            setError(
              `Found ${errorCount} row(s) with errors. Please review and fix before uploading.`
            );
          } else if (validation.validRows === 0) {
            setError('No valid rows found in CSV. Please check your data format.');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process CSV data');
        }
      },
      error: (error) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (!file || !validationResult) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadStatus('Preparing import...');

    try {
      const validOrgs = validationResult.organizations
        .filter((r) => r.data !== null)
        .map((r) => r.data!);
      const validContacts = validationResult.contacts
        .filter((r) => r.data !== null)
        .map((r) => r.data!);

      if (validOrgs.length === 0 && validContacts.length === 0) {
        setError('No valid data to upload');
        setUploading(false);
        return;
      }

      const result: BulkImportResult = {
        success: true,
        organizationsCreated: 0,
        contactsCreated: 0,
        addressesCreated: 0,
        relationshipsCreated: 0,
        organizationDuplicatesSkipped: 0,
        contactDuplicatesSkipped: 0,

        errors: [],
        warnings: [],
      };

      // Calculate total work units for progress
      let totalSteps = 0;
      let completedSteps = 0;

      const orgChunkCount = validOrgs.length > 0 ? Math.ceil(validOrgs.length / CHUNK_SIZE) : 0;
      const contactChunkCount = validContacts.length > 0 ? Math.ceil(validContacts.length / CHUNK_SIZE) : 0;
      totalSteps = orgChunkCount + (validContacts.length > 0 ? 1 + contactChunkCount : 0);
      if (totalSteps === 0) totalSteps = 1;

      const updateProgress = () => {
        completedSteps++;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
      };

      // --- Phase 1: Organizations ---
      if (validOrgs.length > 0) {
        for (let i = 0; i < validOrgs.length; i += CHUNK_SIZE) {
          const chunk = validOrgs.slice(i, i + CHUNK_SIZE);
          const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
          setUploadStatus(`Importing organizations (${chunkNum}/${orgChunkCount})...`);

          const chunkResult = await importOrganizationChunk(companyId, profileId, userEmail, chunk);
          if (!chunkResult.success || !chunkResult.data) {
            result.errors.push({
              rowIndex: i + 1,
              type: 'organization',
              error: chunkResult.error || `Failed to import organization chunk ${chunkNum}`,
            });
          } else {
            result.organizationsCreated += chunkResult.data.organizationsCreated;
            result.addressesCreated += chunkResult.data.addressesCreated;
            result.errors.push(...chunkResult.data.errors);
            result.warnings.push(...chunkResult.data.warnings);
          }
          updateProgress();
        }
      }

      // --- Phase 2: Contacts ---
      if (validContacts.length > 0) {
        // Map each row directly to a DedupedContact with one org link
        const dedupedContacts: DedupedContact[] = validContacts.map((c) => ({
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          title: c.title,
          credentials: c.credentials,
          license_number: c.license_number,
          notes: c.notes,
          street_1: c.street_1,
          street_2: c.street_2,
          city: c.city,
          state: c.state,
          postal_code: c.postal_code,
          country: c.country,
          youtube_url: c.youtube_url,
          linkedin_url: c.linkedin_url,
          x_url: c.x_url,
          facebook_url: c.facebook_url,
          substack_url: c.substack_url,
          orgLinks: c.organization_name ? [{
            organization_name: c.organization_name,
            organization_site_id: c.organization_site_id,
            contact_role: c.contact_role,
          }] : [],
        }));

        // Build org resolution maps
        const contactOrgNames = [
          ...new Set(
            dedupedContacts.flatMap((c) => c.orgLinks.map((l) => l.organization_name))
          ),
        ];
        const mapsResult = await buildOrgResolutionMaps(companyId, contactOrgNames);
        if (!mapsResult.success) {
          throw new Error(mapsResult.error || 'Failed to build organization resolution maps');
        }
        const nameMap = mapsResult.data?.nameMap || {};
        const siteIdMap = mapsResult.data?.siteIdMap || {};
        const ambiguous = mapsResult.data?.ambiguousNames || [];
        updateProgress();

        // Import deduped contact chunks
        const dedupedChunkCount = Math.ceil(dedupedContacts.length / CHUNK_SIZE);
        for (let i = 0; i < dedupedContacts.length; i += CHUNK_SIZE) {
          const chunk = dedupedContacts.slice(i, i + CHUNK_SIZE);
          const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
          setUploadStatus(`Importing contacts (${chunkNum}/${dedupedChunkCount})...`);

          const chunkResult = await importContactChunk(
            companyId, profileId, userEmail, chunk,
            nameMap, siteIdMap, ambiguous
          );
          if (!chunkResult.success || !chunkResult.data) {
            result.errors.push({
              rowIndex: i + 1,
              type: 'contact',
              error: chunkResult.error || `Failed to import contact chunk ${chunkNum}`,
            });
          } else {
            result.contactsCreated += chunkResult.data.contactsCreated;
            result.addressesCreated += chunkResult.data.addressesCreated;
            result.relationshipsCreated += chunkResult.data.relationshipsCreated;
            result.errors.push(...chunkResult.data.errors);
            result.warnings.push(...chunkResult.data.warnings);
          }
          updateProgress();
        }
      }

      setUploadProgress(100);
      setUploadStatus('Finalizing...');

      await revalidateContactsOrganizations();

      // Build success message
      const parts: string[] = [];
      if (result.organizationsCreated > 0) parts.push(`${result.organizationsCreated} organization(s)`);
      if (result.contactsCreated > 0) parts.push(`${result.contactsCreated} contact(s)`);
      if (result.addressesCreated > 0) parts.push(`${result.addressesCreated} address(es)`);
      if (result.relationshipsCreated > 0) parts.push(`${result.relationshipsCreated} relationship(s)`);

      const successMessage = parts.length > 0
        ? `Imported: ${parts.join(', ')}`
        : 'No new records to import';

      toast({
        title: 'Upload Complete',
        description: successMessage,
      });

      if (result.errors.length > 0 || result.warnings.length > 0) {
        const errorMessages = result.errors.map((e) => `Row ${e.rowIndex}: ${e.error}`).join('; ');
        const warningMessages = result.warnings.join('; ');
        toast({
          title: 'Upload completed with issues',
          description: `${errorMessages}${warningMessages ? `; ${warningMessages}` : ''}`,
          variant: 'destructive',
        });
      }

      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload data');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleDownloadTemplate = (type: 'organizations' | 'contacts') => {
    try {
      const csvContent = type === 'organizations' 
        ? generateOrganizationCSVTemplate()
        : generateContactCSVTemplate();
      
      const fileName = type === 'organizations'
        ? 'organizations_template.csv'
        : 'contacts_template.csv';
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Template downloaded',
        description: `${type === 'organizations' ? 'Organizations' : 'Contacts'} CSV template has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to generate template file',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPreviewData({ organizations: [], contacts: [] });
    setValidationResult(null);
    setError(null);
    setDragActive(false);
    setUploadProgress(0);
    setUploadStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canUpload =
    file &&
    !parsing &&
    !uploading &&
    validationResult &&
    validationResult.validRows > 0 &&
    validationResult.invalidRows === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-xs" />
        }
      >
        <Upload className="h-4 w-4 mr-2" />
        Bulk Upload
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-full">
        <DialogHeader>
          <DialogTitle className="text-lg">Bulk Upload Organizations & Contacts</DialogTitle>
          <DialogDescription className="text-xs">
            Upload a CSV file with organization and/or contact data. The system will automatically detect row types based on column headers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full min-w-0">
          {/* Download Template Buttons */}
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('organizations')}
              className="text-xs"
            >
              <Download className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Download Organizations Template</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('contacts')}
              className="text-xs"
            >
              <Download className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Download Contacts Template</span>
            </Button>
          </div>

          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drop your CSV file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreviewData({ organizations: [], contacts: [] });
                    setValidationResult(null);
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parsing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing CSV...
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{uploadStatus}</span>
                    <span className="font-medium tabular-nums">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {validationResult && !uploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      Found {validationResult.organizations.length} organization row(s) and{' '}
                      {validationResult.contacts.length} contact row(s)
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Valid: {validationResult.validRows} | Invalid: {validationResult.invalidRows}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-destructive font-medium mb-1">Error</p>
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {validationResult && validationResult.invalidRows > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive">Validation Errors:</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 text-xs">
                    {validationResult.organizations
                      .filter((r) => r.errors.length > 0)
                      .map((r) => (
                        <div key={r.rowIndex} className="mb-1">
                          <span className="font-medium">Row {r.rowIndex} (Organization):</span>{' '}
                          {r.errors.join(', ')}
                        </div>
                      ))}
                    {validationResult.contacts
                      .filter((r) => r.errors.length > 0)
                      .map((r) => (
                        <div key={r.rowIndex} className="mb-1">
                          <span className="font-medium">Row {r.rowIndex} (Contact):</span>{' '}
                          {r.errors.join(', ')}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {!parsing && !error && !uploading && (previewData.organizations.length > 0 || previewData.contacts.length > 0) && (
                <div className="space-y-4">
                  {previewData.organizations.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <p className="text-xs font-medium mb-2">
                        Organizations Preview (first {previewData.organizations.length}):
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">Name</th>
                              <th className="text-left p-1">Type</th>
                              <th className="text-left p-1">Site ID</th>
                              <th className="text-left p-1">City</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.organizations.map((org, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{org.name}</td>
                                <td className="p-1">{org.organization_type}</td>
                                <td className="p-1">{org.site_id || '-'}</td>
                                <td className="p-1">{org.city || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {previewData.contacts.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <p className="text-xs font-medium mb-2">
                        Contacts Preview (first {previewData.contacts.length}):
                      </p>
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-xs min-w-0">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">First Name</th>
                              <th className="text-left p-1">Last Name</th>
                              <th className="text-left p-1">Email</th>
                              <th className="text-left p-1">Organization</th>
                              <th className="text-left p-1">Site ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.contacts.map((contact, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{contact.first_name}</td>
                                <td className="p-1">{contact.last_name}</td>
                                <td className="p-1">{contact.email}</td>
                                <td className="p-1">{contact.organization_name || '-'}</td>
                                <td className="p-1">{contact.organization_site_id || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!canUpload || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Data'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
