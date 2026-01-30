"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Loader2 } from "lucide-react";
import { EditableCell } from "./editable-cell";
import { 
  PendingDocumentRecord, 
  DocumentRecordInput,
  uploadDocumentFile,
  createDocumentRecord,
  getTemplateZoneNames,
  getTemplateSectionNames,
  getTemplateArtifactNames,
  getTemplateSubArtifacts,
  getTemplateRecord
} from "@/lib/actions/document-management-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EditableDocumentTableProps {
  pendingDocuments: PendingDocumentRecord[];
  onDocumentUpdate: (tempId: string, updates: Partial<DocumentRecordInput>) => void;
  onDocumentSave: (tempId: string) => Promise<void>;
  onDocumentDelete: (tempId: string) => void;
  onViewDocument?: (filePath: string, fileName?: string) => void;
  companyId: string;
  profileId: string;
}

export function EditableDocumentTable({ 
  pendingDocuments, 
  onDocumentUpdate, 
  onDocumentSave, 
  onDocumentDelete,
  onViewDocument,
  companyId,
  profileId
}: EditableDocumentTableProps) {
  const [editedRecords, setEditedRecords] = useState<Record<string, Partial<DocumentRecordInput>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Template dropdown state
  const [zoneNames, setZoneNames] = useState<string[]>([]);
  const [sectionNamesCache, setSectionNamesCache] = useState<Record<string, string[]>>({});
  const [artifactNamesCache, setArtifactNamesCache] = useState<Record<string, string[]>>({});
  const [subArtifactsCache, setSubArtifactsCache] = useState<Record<string, string[]>>({});

  // Load section names for a zone
  const loadSectionNames = useCallback(async (zoneName: string) => {
    if (!zoneName || sectionNamesCache[zoneName]) return;
    
    const result = await getTemplateSectionNames(companyId, zoneName);
    if (result.success && result.data) {
      setSectionNamesCache(prev => ({ ...prev, [zoneName]: result.data || [] }));
    }
  }, [companyId, sectionNamesCache]);

  // Load artifact names for zone + section
  const loadArtifactNames = useCallback(async (zoneName: string, sectionName: string) => {
    if (!zoneName || !sectionName) return;
    const key = `${zoneName}|${sectionName}`;
    if (artifactNamesCache[key]) return;
    
    const result = await getTemplateArtifactNames(companyId, zoneName, sectionName);
    if (result.success && result.data) {
      setArtifactNamesCache(prev => ({ ...prev, [key]: result.data || [] }));
    }
  }, [companyId, artifactNamesCache]);

  // Load sub-artifacts for zone + section + artifact
  const loadSubArtifacts = useCallback(async (zoneName: string, sectionName: string, artifactName: string) => {
    if (!zoneName || !sectionName || !artifactName) return;
    const key = `${zoneName}|${sectionName}|${artifactName}`;
    if (subArtifactsCache[key]) return;
    
    const result = await getTemplateSubArtifacts(companyId, zoneName, sectionName, artifactName);
    if (result.success && result.data) {
      setSubArtifactsCache(prev => ({ ...prev, [key]: result.data || [] }));
    }
  }, [companyId, subArtifactsCache]);

  // Load zone names on mount
  useEffect(() => {
    const loadZoneNames = async () => {
      console.log('Loading zone names for company:', companyId);
      const result = await getTemplateZoneNames(companyId);
      console.log('Zone names result:', result);
      if (result.success && result.data) {
        console.log('Setting zone names:', result.data);
        setZoneNames(result.data);
      } else {
        console.error('Failed to load zone names:', result.error);
      }
    };
    if (companyId) {
      loadZoneNames();
    }
  }, [companyId]);

  // Load options for existing document values
  useEffect(() => {
    pendingDocuments.forEach(doc => {
      const zone = doc.documentType;
      const section = doc.documentCategory;
      const artifact = doc.artifactName;
      
      if (zone && !sectionNamesCache[zone]) {
        loadSectionNames(zone);
      }
      if (zone && section) {
        const key = `${zone}|${section}`;
        if (!artifactNamesCache[key]) {
          loadArtifactNames(zone, section);
        }
      }
      if (zone && section && artifact) {
        const key = `${zone}|${section}|${artifact}`;
        if (!subArtifactsCache[key]) {
          loadSubArtifacts(zone, section, artifact);
        }
      }
    });
  }, [pendingDocuments, sectionNamesCache, artifactNamesCache, subArtifactsCache, loadSectionNames, loadArtifactNames, loadSubArtifacts]);

  const handleCellChange = (tempId: string, field: keyof DocumentRecordInput, value: string) => {
    // Update local edited state
    setEditedRecords(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        [field]: value,
      },
    }));
    
    // Update parent state
    onDocumentUpdate(tempId, { [field]: value });
  };

  const handleZoneChange = async (tempId: string, zoneName: string) => {
    handleCellChange(tempId, "documentType", zoneName);
    // Clear dependent fields
    handleCellChange(tempId, "documentCategory", "");
    handleCellChange(tempId, "artifactName", "");
    handleCellChange(tempId, "recommendedSubArtifacts", "");
    // Load sections for this zone
    if (zoneName) {
      await loadSectionNames(zoneName);
    }
  };

  const handleSectionChange = async (tempId: string, sectionName: string) => {
    const doc = pendingDocuments.find(d => d.tempId === tempId);
    if (!doc) return;
    
    handleCellChange(tempId, "documentCategory", sectionName);
    // Clear dependent fields
    handleCellChange(tempId, "artifactName", "");
    handleCellChange(tempId, "recommendedSubArtifacts", "");
    
    // Load artifacts for zone + section
    const zoneName = doc.documentType || editedRecords[tempId]?.documentType;
    if (zoneName) {
      await loadArtifactNames(zoneName, sectionName);
    }
  };

  const handleArtifactChange = async (tempId: string, artifactName: string) => {
    const doc = pendingDocuments.find(d => d.tempId === tempId);
    if (!doc) return;
    
    handleCellChange(tempId, "artifactName", artifactName);
    // Clear dependent field
    handleCellChange(tempId, "recommendedSubArtifacts", "");
    
    // Load sub-artifacts
    const zoneName = doc.documentType || editedRecords[tempId]?.documentType;
    const sectionName = doc.documentCategory || editedRecords[tempId]?.documentCategory;
    if (zoneName && sectionName) {
      await loadSubArtifacts(zoneName, sectionName, artifactName);
    }
    
    // Auto-populate document name
    await autoPopulateDocumentName(tempId, zoneName || "", sectionName || "", artifactName);
  };

  const handleSubArtifactChange = async (tempId: string, subArtifact: string) => {
    handleCellChange(tempId, "recommendedSubArtifacts", subArtifact);
    
    // Auto-populate document name with sub-artifact
    const doc = pendingDocuments.find(d => d.tempId === tempId);
    if (!doc) return;
    
    const zoneName = doc.documentType || editedRecords[tempId]?.documentType;
    const sectionName = doc.documentCategory || editedRecords[tempId]?.documentCategory;
    const artifactName = doc.artifactName || editedRecords[tempId]?.artifactName;
    
    if (zoneName && sectionName && artifactName) {
      await autoPopulateDocumentName(tempId, zoneName, sectionName, artifactName, subArtifact);
    }
  };

  const autoPopulateDocumentName = async (
    tempId: string,
    zoneName: string,
    sectionName: string,
    artifactName: string,
    subArtifact?: string
  ) => {
    if (!zoneName || !sectionName || !artifactName) return;
    
    try {
      const result = await getTemplateRecord(companyId, zoneName, sectionName, artifactName, subArtifact);
      if (result.success && result.data) {
        handleCellChange(tempId, "documentName", result.data.suggestedDocumentName);
      }
    } catch (error) {
      // Silently fail - user can manually enter name
      console.error('Failed to auto-populate document name:', error);
    }
  };

  const hasChanges = (tempId: string): boolean => {
    return !!editedRecords[tempId] && Object.keys(editedRecords[tempId]).length > 0;
  };

  const getFieldValue = (record: PendingDocumentRecord, field: keyof DocumentRecordInput): string => {
    const edited = editedRecords[record.tempId];
    if (edited && edited[field] !== undefined) {
      return edited[field] as string;
    }
    
    const value = record[field];
    
    // Handle date fields
    if ((field === 'uploadDate' || field === 'approvalDate' || field === 'expirationDate') && value) {
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          return value.split('T')[0];
        }
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          return "";
        }
      }
    }
    
    return value || "";
  };

  const getZoneOptions = () => {
    console.log('getZoneOptions called, zoneNames:', zoneNames);
    return zoneNames.map(zone => ({ value: zone, label: zone }));
  };

  const getSectionOptions = (zoneName: string) => {
    if (!zoneName) return [];
    const sections = sectionNamesCache[zoneName] || [];
    return sections.map(section => ({ value: section, label: section }));
  };

  const getArtifactOptions = (zoneName: string, sectionName: string) => {
    if (!zoneName || !sectionName) return [];
    const key = `${zoneName}|${sectionName}`;
    const artifacts = artifactNamesCache[key] || [];
    return artifacts.map(artifact => ({ value: artifact, label: artifact }));
  };

  const getSubArtifactOptions = (zoneName: string, sectionName: string, artifactName: string) => {
    if (!zoneName || !sectionName || !artifactName) return [];
    const key = `${zoneName}|${sectionName}|${artifactName}`;
    const subArtifacts = subArtifactsCache[key] || [];
    return subArtifacts.map(sub => ({ value: sub, label: sub }));
  };

  const handleSave = async (doc: PendingDocumentRecord) => {
    setSavingIds(prev => new Set(prev).add(doc.tempId));

    try {
      // 1. Upload file to storage
      const uploadResult = await uploadDocumentFile(doc.file, companyId, profileId);
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      // 2. Create document record in DB
      const recordResult = await createDocumentRecord(
        {
          documentName: doc.documentName,
          documentType: doc.documentType,
          documentCategory: doc.documentCategory,
          version: doc.version,
          status: 'Draft', // Always Draft for new uploads
          siteName: doc.siteName,
          projectId: doc.projectId,
          uploadDate: doc.uploadDate,
          approvalDate: doc.approvalDate,
          expirationDate: doc.expirationDate,
          approvedBy: doc.approvedBy,
          artifactName: doc.artifactName,
          recommendedSubArtifacts: doc.recommendedSubArtifacts,
        },
        companyId,
        profileId,
        uploadResult.data.filePath,
        uploadResult.data.fileSize
      );
      
      if (!recordResult.success) {
        throw new Error(recordResult.error || 'Failed to create record');
      }
      
      // Remove from edited records
      setEditedRecords(prev => {
        const newEdited = { ...prev };
        delete newEdited[doc.tempId];
        return newEdited;
      });
      
      toast({
        title: "Success",
        description: `Document "${doc.documentName}" saved successfully`,
      });
      
      // 3. Call parent to remove from staging
      await onDocumentSave(doc.tempId);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.tempId);
        return newSet;
      });
    }
  };

  const handleDelete = async (doc: PendingDocumentRecord) => {
    if (!confirm(`Remove "${doc.documentName || 'this document'}" from upload queue?`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(doc.tempId));

    try {
      // Remove from edited records if present
      setEditedRecords(prev => {
        const newEdited = { ...prev };
        delete newEdited[doc.tempId];
        return newEdited;
      });
      
      toast({
        title: "Removed",
        description: "Document removed from upload queue",
      });
      
      onDocumentDelete(doc.tempId);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.tempId);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  if (pendingDocuments.length === 0) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <p className="text-sm text-muted-foreground">No documents uploaded yet. Upload files using the form above.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] table-fixed">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[150px]">File</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Site Name</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Zone Name</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Section Name</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Artifact name</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Recommended Sub-artifacts</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[225px]">Document Name</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[80px]">Version</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[80px]">Status</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[150px]">Approval Date</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[150px]">Expiration Date</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[80px]">Size</th>
              <th className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 w-[60px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDocuments.map((doc) => {
              const isSaving = savingIds.has(doc.tempId);
              const isDeleting = deletingIds.has(doc.tempId);
              const hasUnsavedChanges = hasChanges(doc.tempId);
              
              const currentZone = getFieldValue(doc, "documentType");
              const currentSection = getFieldValue(doc, "documentCategory");
              const currentArtifact = getFieldValue(doc, "artifactName");
              
              return (
                <tr
                  key={doc.tempId}
                  className={cn(
                    "border-b last:border-b-0 hover:bg-muted/30",
                    "bg-yellow-50/50"
                  )}
                >
                  <td className="p-1 border-r last:border-r-0 w-[150px]">
                    <div className="text-xs text-muted-foreground px-2 truncate max-w-[120px]" title={doc.file.name}>
                      {doc.file.name}
                    </div>
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "siteName")}
                      type="text"
                      onChange={(value) => handleCellChange(doc.tempId, "siteName", value)}
                      placeholder="Site name"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "documentType")}
                      type="select"
                      options={getZoneOptions()}
                      onChange={(value) => handleZoneChange(doc.tempId, value)}
                      placeholder="Select Zone"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "documentCategory")}
                      type="select"
                      options={getSectionOptions(currentZone)}
                      onChange={(value) => handleSectionChange(doc.tempId, value)}
                      placeholder="Select Section"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "artifactName")}
                      type="select"
                      options={getArtifactOptions(currentZone, currentSection)}
                      onChange={(value) => handleArtifactChange(doc.tempId, value)}
                      placeholder="Select Artifact"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "recommendedSubArtifacts")}
                      type="select"
                      options={getSubArtifactOptions(currentZone, currentSection, currentArtifact)}
                      onChange={(value) => handleSubArtifactChange(doc.tempId, value)}
                      placeholder="Select Sub-artifact"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[225px]">
                    <EditableCell
                      value={getFieldValue(doc, "documentName")}
                      type="text"
                      onChange={(value) => handleCellChange(doc.tempId, "documentName", value)}
                      placeholder="Document name"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[80px]">
                    <EditableCell
                      value={getFieldValue(doc, "version")}
                      type="text"
                      onChange={(value) => handleCellChange(doc.tempId, "version", value)}
                      placeholder="Version"
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[80px]">
                    <EditableCell
                      value="Draft"
                      type="readonly"
                      onChange={() => {}}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[150px]">
                    <EditableCell
                      value={getFieldValue(doc, "approvalDate")}
                      type="date"
                      onChange={(value) => handleCellChange(doc.tempId, "approvalDate", value)}
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[150px]">
                    <EditableCell
                      value={getFieldValue(doc, "expirationDate")}
                      type="date"
                      onChange={(value) => handleCellChange(doc.tempId, "expirationDate", value)}
                      isEdited={hasUnsavedChanges}
                    />
                  </td>
                  <td className="p-1 border-r last:border-r-0 w-[80px]">
                    <EditableCell
                      value={formatFileSize(doc.file.size)}
                      type="readonly"
                    />
                  </td>
                  <td className="p-0.5 border-r last:border-r-0 w-[60px]">
                    <div className="flex items-center justify-center gap-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSave(doc)}
                        disabled={isSaving || isDeleting}
                        className="h-6 text-[10px] px-1 min-w-0"
                        title="Save document to system"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={isDeleting || isSaving}
                        className="h-6 text-[10px] px-1 min-w-0 text-destructive hover:text-destructive"
                        title="Remove from upload queue"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
