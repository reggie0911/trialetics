'use client';

import { useState, useEffect, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createEtmfDocument,
  uploadEtmfDocumentFile,
  getEtmfCountries,
  getEtmfSites,
  getEtmfStaffMembers,
  getTmfReferenceModel,
} from '@/lib/actions/etmf';
import type {
  EtmfCountryOption,
  EtmfSiteOption,
  EtmfStaffMemberOption,
  TmfReferenceModel,
} from '@/lib/types/etmf';
import { toast } from 'sonner';

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string | null;
  onSuccess: () => void;
}

export function AddDocumentModal({ open, onOpenChange, studyId, onSuccess }: AddDocumentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [countries, setCountries] = useState<EtmfCountryOption[]>([]);
  const [sites, setSites] = useState<EtmfSiteOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<EtmfStaffMemberOption[]>([]);
  const [tmfRefs, setTmfRefs] = useState<TmfReferenceModel[]>([]);

  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedArtifact, setSelectedArtifact] = useState<string>('');
  const [selectedSubArtifact, setSelectedSubArtifact] = useState<string>('');

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedStaffRole, setSelectedStaffRole] = useState<string>('');
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');

  const [documentSignedDate, setDocumentSignedDate] = useState<string>('');
  const [approvalDate, setApprovalDate] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [versionDate, setVersionDate] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [language, setLanguage] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && studyId) {
      startTransition(async () => {
        const [countriesRes, sitesRes, staffRes, tmfRes] = await Promise.all([
          getEtmfCountries(studyId),
          getEtmfSites(studyId),
          getEtmfStaffMembers(studyId),
          getTmfReferenceModel(),
        ]);
        setCountries(countriesRes.data || []);
        setSites(sitesRes.data || []);
        setStaffMembers(staffRes.data || []);
        setTmfRefs(tmfRes.data || []);
      });
    }
  }, [open, studyId]);

  const zones = [...new Set(tmfRefs.map((r) => r.zone_number))].sort((a, b) => a - b);
  const filteredSections = selectedZone
    ? [...new Set(tmfRefs.filter((r) => r.zone_number === parseInt(selectedZone)).map((r) => r.section_number))]
    : [];
  const filteredArtifacts = selectedSection
    ? [...new Set(tmfRefs.filter((r) => r.section_number === selectedSection).map((r) => r.artifact_number))]
    : [];
  const filteredSubArtifacts = selectedArtifact
    ? tmfRefs
        .filter((r) => r.artifact_number === selectedArtifact)
        .map((r) => r.recommended_sub_artifact)
        .filter((s): s is string => s !== null)
    : [];

  const roles = [...new Set(staffMembers.map((s) => s.role))];
  const filteredStaff = selectedStaffRole
    ? staffMembers.filter((s) => s.role === selectedStaffRole)
    : staffMembers;

  const selectedTmfRef = tmfRefs.find(
    (r) =>
      r.artifact_number === selectedArtifact &&
      r.recommended_sub_artifact === selectedSubArtifact
  );

  const handleReset = () => {
    setSelectedZone('');
    setSelectedSection('');
    setSelectedArtifact('');
    setSelectedSubArtifact('');
    setSelectedSiteId('');
    setSelectedStaffRole('');
    setSelectedStaffName('');
    setDocumentSignedDate('');
    setApprovalDate('');
    setExpirationDate('');
    setVersionDate('');
    setVersion('');
    setLanguage('');
    setSelectedFile(null);
  };

  const handleSubmit = () => {
    if (!studyId) return;

    const documentName = selectedSubArtifact || selectedArtifact || 'Untitled Document';
    const selectedSite = sites.find((s) => s.id === selectedSiteId);
    const selectedStaff = staffMembers.find((s) => s.id === selectedStaffName);

    startTransition(async () => {
      const { success, data, error } = await createEtmfDocument({
        study_id: studyId,
        study_country_id: selectedSite?.study_country_id,
        site_id: selectedSiteId || null,
        staff_member_id: selectedStaff?.id || null,
        tmf_ref_id: selectedTmfRef?.id || null,
        document_name: documentName,
        version: version || null,
        language: language || null,
        document_signed_date: documentSignedDate || null,
        approval_date: approvalDate || null,
        expiration_date: expirationDate || null,
        version_date: versionDate || null,
      });

      if (success && data && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        await uploadEtmfDocumentFile(data.id, formData);
      }

      if (success) {
        toast.success('Document created successfully');
        handleReset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(error || 'Failed to create document');
      }
    });
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Document</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          <DialogDescription>
            Create a new document entry in the eTMF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Document Categories</h3>

            <div className="space-y-2">
              <Label className="text-xs">Zone</Label>
              <Select value={selectedZone} onValueChange={(v) => { setSelectedZone(v); setSelectedSection(''); setSelectedArtifact(''); setSelectedSubArtifact(''); }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Zone...">
                    {selectedZone 
                      ? tmfRefs.find(r => r.zone_number === parseInt(selectedZone))?.zone_name || 'Select Zone...'
                      : 'Select Zone...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => {
                    const zoneRef = tmfRefs.find((r) => r.zone_number === z);
                    return (
                      <SelectItem key={z} value={z.toString()} className="text-xs">
                        {zoneRef?.zone_name || `Zone ${z}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Section</Label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedArtifact(''); setSelectedSubArtifact(''); }} disabled={!selectedZone}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Section...">
                    {selectedSection 
                      ? tmfRefs.find(r => r.section_number === selectedSection)?.section_name || 'Select Section...'
                      : 'Select Section...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredSections.map((s) => {
                    const sectionRef = tmfRefs.find((r) => r.section_number === s);
                    return (
                      <SelectItem key={s} value={s} className="text-xs">
                        {sectionRef?.section_name || s}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Artifact</Label>
              <Select value={selectedArtifact} onValueChange={(v) => { setSelectedArtifact(v); setSelectedSubArtifact(''); }} disabled={!selectedSection}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Artifact...">
                    {selectedArtifact 
                      ? tmfRefs.find(r => r.artifact_number === selectedArtifact)?.artifact_name || 'Select Artifact...'
                      : 'Select Artifact...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredArtifacts.map((a) => {
                    const artRef = tmfRefs.find((r) => r.artifact_number === a);
                    return (
                      <SelectItem key={a} value={a} className="text-xs">
                        {artRef?.artifact_name || a}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Sub-Artifact</Label>
              <Select value={selectedSubArtifact} onValueChange={setSelectedSubArtifact} disabled={!selectedArtifact}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Sub-Artifact...">
                    {selectedSubArtifact || 'Select Sub-Artifact...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredSubArtifacts.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm">Document Information</h3>

            <div className="space-y-2">
              <Label className="text-xs">Site Name</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Site...">
                    {selectedSiteId 
                      ? sites.find(s => s.id === selectedSiteId)?.name || 'Select Site...'
                      : 'Select Site...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Staff Role</Label>
              <Select value={selectedStaffRole} onValueChange={(v) => { setSelectedStaffRole(v); setSelectedStaffName(''); }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Role...">
                    {selectedStaffRole 
                      ? selectedStaffRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      : 'Select Role...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs capitalize">
                      {r.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Staff Name</Label>
              <Select value={selectedStaffName} onValueChange={setSelectedStaffName}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Staff Member...">
                    {selectedStaffName 
                      ? staffMembers.find(s => s.id === selectedStaffName)?.name || 'Select Staff Member...'
                      : 'Select Staff Member...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-2 space-y-4">
            <h3 className="font-medium text-sm">Document Specifications</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Document Signed Date</Label>
                <Input
                  type="date"
                  value={documentSignedDate}
                  onChange={(e) => setDocumentSignedDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Approval Date</Label>
                <Input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Expiration Date</Label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Version Date</Label>
                <Input
                  type="date"
                  value={versionDate}
                  onChange={(e) => setVersionDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Version</Label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="Type here..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Language</Label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Type here..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Upload Document</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                >
                  {selectedFile ? selectedFile.name : 'Click to upload a file'}
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
