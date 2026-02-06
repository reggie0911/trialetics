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
import { useToast } from '@/hooks/use-toast';
import {
  CSVRow,
  OrganizationCSVRow,
  ContactCSVRow,
  ValidationResult,
} from '@/lib/types/contacts-organizations-csv';
import {
  validateCSVData,
  detectRowType,
} from '@/lib/utils/contacts-organizations-csv-validator';
import {
  bulkImportWithRelationships,
} from '@/lib/actions/bulk-import';
import {
  generateOrganizationCSVTemplate,
  generateContactCSVTemplate,
} from '@/lib/utils/csv-template-generator';

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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

        // Filter out delimiter detection warnings
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

          // Extract valid data for preview
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

          // Show warnings if there are validation errors
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

    try {
      // Extract valid data
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

      const result = await bulkImportWithRelationships(
        companyId,
        profileId,
        userEmail,
        validOrgs,
        validContacts
      );

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to upload data');
        setUploading(false);
        return;
      }

      const { data } = result;
      const successMessage = `Successfully imported: ${data.organizationsCreated} organization(s), ${data.contactsCreated} contact(s), ${data.addressesCreated} address(es), ${data.relationshipsCreated} relationship(s)`;

      toast({
        title: 'Upload Successful',
        description: successMessage,
      });

      if (data.errors.length > 0 || data.warnings.length > 0) {
        const errorMessages = data.errors.map((e) => `Row ${e.rowIndex}: ${e.error}`).join('; ');
        const warningMessages = data.warnings.join('; ');
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
      
      // Clean up the URL object
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
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading data...
                </div>
              )}

              {validationResult && (
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
                  {validationResult.duplicateRows.length > 0 && (
                    <div className="text-xs text-yellow-600">
                      Warning: {validationResult.duplicateRows.length} duplicate row(s) detected
                    </div>
                  )}
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

              {!parsing && !error && (previewData.organizations.length > 0 || previewData.contacts.length > 0) && (
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
                              <th className="text-left p-1">Email</th>
                              <th className="text-left p-1">City</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.organizations.map((org, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{org.name}</td>
                                <td className="p-1">{org.organization_type}</td>
                                <td className="p-1">{org.email || '-'}</td>
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
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.contacts.map((contact, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{contact.first_name}</td>
                                <td className="p-1">{contact.last_name}</td>
                                <td className="p-1">{contact.email || '-'}</td>
                                <td className="p-1">{contact.organization_name || '-'}</td>
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
