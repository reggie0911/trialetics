'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TmfZoneNode, TmfSectionNode, TmfArtifactNode } from '@/lib/types/etmf';

interface TmfFolderTreeProps {
  tree: TmfZoneNode[];
  selectedArtifact?: string;
}

export function TmfFolderTree({ tree, selectedArtifact }: TmfFolderTreeProps) {
  const [expandedZones, setExpandedZones] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleZone = (zoneNumber: number) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneNumber)) {
        next.delete(zoneNumber);
      } else {
        next.add(zoneNumber);
      }
      return next;
    });
  };

  const toggleSection = (sectionNumber: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionNumber)) {
        next.delete(sectionNumber);
      } else {
        next.add(sectionNumber);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        TMF Structure
      </div>
      {tree.map((zone) => (
        <ZoneItem
          key={zone.zone_number}
          zone={zone}
          isExpanded={expandedZones.has(zone.zone_number)}
          expandedSections={expandedSections}
          selectedArtifact={selectedArtifact}
          onToggleZone={() => toggleZone(zone.zone_number)}
          onToggleSection={toggleSection}
        />
      ))}
    </div>
  );
}

interface ZoneItemProps {
  zone: TmfZoneNode;
  isExpanded: boolean;
  expandedSections: Set<string>;
  selectedArtifact?: string;
  onToggleZone: () => void;
  onToggleSection: (sectionNumber: string) => void;
}

function ZoneItem({
  zone,
  isExpanded,
  expandedSections,
  selectedArtifact,
  onToggleZone,
  onToggleSection,
}: ZoneItemProps) {
  return (
    <div>
      <button
        onClick={onToggleZone}
        className="flex items-center gap-1 w-full text-left py-1 px-1 hover:bg-muted rounded text-xs"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{zone.zone_name}</span>
      </button>

      {isExpanded && zone.sections && (
        <div className="ml-4">
          {zone.sections.map((section) => (
            <SectionItem
              key={section.section_number}
              section={section}
              isExpanded={expandedSections.has(section.section_number)}
              selectedArtifact={selectedArtifact}
              onToggle={() => onToggleSection(section.section_number)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionItemProps {
  section: TmfSectionNode;
  isExpanded: boolean;
  selectedArtifact?: string;
  onToggle: () => void;
}

function SectionItem({ section, isExpanded, selectedArtifact, onToggle }: SectionItemProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 w-full text-left py-1 px-1 hover:bg-muted rounded text-xs"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{section.section_name}</span>
      </button>

      {isExpanded && section.artifacts && (
        <div className="ml-4">
          {section.artifacts.map((artifact) => (
            <ArtifactItem
              key={artifact.artifact_number}
              artifact={artifact}
              isSelected={artifact.artifact_number === selectedArtifact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ArtifactItemProps {
  artifact: TmfArtifactNode;
  isSelected: boolean;
}

function ArtifactItem({ artifact, isSelected }: ArtifactItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 py-1 px-1 rounded text-xs',
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
    >
      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{artifact.artifact_name}</span>
    </div>
  );
}
