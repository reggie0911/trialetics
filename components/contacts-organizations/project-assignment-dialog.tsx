'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getUserProjects } from '@/lib/actions/projects';
import { assignOrganizationToProject } from '@/lib/actions/organizations';
import { assignContactToProject } from '@/lib/actions/contacts';
import { getAllOrganizations } from '@/lib/actions/organizations';
import { formatFieldName } from '@/lib/utils';
import {
  Organization,
  OrganizationProjectRole,
  ContactProjectRole,
  ORGANIZATION_PROJECT_ROLE_LABELS,
  CONTACT_PROJECT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';

interface Project {
  id: string;
  protocol_number: string;
  protocol_name: string;
  protocol_status: string;
  regions_required?: boolean;
  countries?: Array<{ id: string; countryName: string }>;
}

interface ProjectAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  entityType: 'organization' | 'contact';
  entityId: string;
  entityName: string;
  companyId: string;
  existingProjectIds?: string[];
}

export function ProjectAssignmentDialog({
  open,
  onOpenChange,
  onSuccess,
  entityType,
  entityId,
  entityName,
  companyId,
  existingProjectIds = [],
}: ProjectAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    
    // Load projects
    const projectResult = await getUserProjects();
    if (projectResult.success && projectResult.data && Array.isArray(projectResult.data)) {
      // Filter out projects already assigned
      const availableProjects = projectResult.data.filter(
        (p: Project) => !existingProjectIds.includes(p.id)
      );
      setProjects(availableProjects);
    }

    // If assigning a contact, also load organizations for optional affiliation
    if (entityType === 'contact') {
      const orgResult = await getAllOrganizations(companyId);
      if (orgResult.success && orgResult.data) {
        setOrganizations(orgResult.data);
      }
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setSelectedRole(entityType === 'organization' ? 'site' : 'coordinator');
    setSelectedOrgId('');
    setSelectedRegionId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setCountry('');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const showRegionSelector =
    entityType === 'organization' &&
    selectedRole === 'site' &&
    selectedProject?.regions_required &&
    (selectedProject?.countries?.length ?? 0) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (entityType === 'organization') {
        result = await assignOrganizationToProject({
          organization_id: entityId,
          protocol_id: selectedProjectId,
          role: selectedRole as OrganizationProjectRole,
          region_id: showRegionSelector ? selectedRegionId : null,
          status: 'active',
          start_date: startDate || null,
          end_date: endDate || null,
        });
      } else {
        result = await assignContactToProject({
          contact_id: entityId,
          protocol_id: selectedProjectId,
          organization_id: selectedOrgId || null,
          role: selectedRole as ContactProjectRole,
          status: 'active',
          start_date: startDate || null,
          end_date: endDate || null,
          country: country || null,
        });
      }

      if (result.success) {
        toast({
          title: 'Project assigned',
          description: `${entityName} has been assigned to the project.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign project',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels = entityType === 'organization' 
    ? ORGANIZATION_PROJECT_ROLE_LABELS 
    : CONTACT_PROJECT_ROLE_LABELS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-base">Assign to Project</DialogTitle>
          <DialogDescription className="text-xs">
            Assign {entityName} to a project
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No available projects. This {entityType} is already assigned to all projects.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="project" className="text-xs">Project *</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => {
                  if (v) {
                    setSelectedProjectId(v);
                    setSelectedRegionId('');
                  }
                }}
              >
                <SelectTrigger className="text-xs md:text-xs w-full">
                  <span className="text-xs">
                    {selectedProjectId 
                      ? (() => {
                          const project = projects.find(p => p.id === selectedProjectId);
                          return project ? `${project.protocol_number} - ${project.protocol_name}` : 'Select a project';
                        })()
                      : 'Select a project'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs">
                      {project.protocol_number} - {project.protocol_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs">Institution Type *</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => {
                  if (v) {
                    setSelectedRole(v);
                    if (v !== 'site') setSelectedRegionId('');
                  }
                }}
              >
                <SelectTrigger className="text-xs md:text-xs w-full">
                  <span className="text-xs capitalize">
                    {selectedRole ? roleLabels[selectedRole as keyof typeof roleLabels] || formatFieldName(selectedRole) : 'Select role'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showRegionSelector && (
              <div className="space-y-1">
                <Label htmlFor="region" className="text-xs">Region *</Label>
                <Select
                  value={selectedRegionId}
                  onValueChange={(v) => v && setSelectedRegionId(v)}
                >
                  <SelectTrigger className="text-xs md:text-xs w-full">
                    <span className="text-xs">
                      {selectedRegionId
                        ? selectedProject?.countries?.find((c) => c.id === selectedRegionId)?.countryName ?? 'Select region'
                        : 'Select region'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProject?.countries?.map((region) => (
                      <SelectItem key={region.id} value={region.id} className="text-xs">
                        {region.countryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Start/End Date fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start_date" className="text-xs">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  className="text-xs h-8"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date" className="text-xs">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  className="text-xs h-8"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Country field for contact assignments */}
            {entityType === 'contact' && (
              <div className="space-y-1">
                <Label htmlFor="country" className="text-xs">Country</Label>
                <Input
                  id="country"
                  type="text"
                  className="text-xs h-8"
                  placeholder="e.g. United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedProjectId || !selectedRole || (showRegionSelector && !selectedRegionId)} 
                className="text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign to Project'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
