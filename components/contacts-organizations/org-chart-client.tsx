'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getContactsForOrgChart } from '@/lib/actions/org-chart';
import type { ContactForOrgChart } from '@/lib/actions/org-chart';
import { ChevronDown, ChevronRight, User } from 'lucide-react';

interface OrgChartClientProps {
  companyId: string;
}

function OrgChartNode({ node }: { node: ContactForOrgChart }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer group">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="p-0.5 hover:bg-muted rounded"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <span className="font-medium truncate block">
              {node.first_name} {node.last_name}
            </span>
            {node.title && (
              <span className="text-xs text-muted-foreground truncate block">
                {node.title}
              </span>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-muted ml-4">
          {node.children!.map((child) => (
            <OrgChartNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartClient({ companyId }: OrgChartClientProps) {
  const [roots, setRoots] = useState<ContactForOrgChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getContactsForOrgChart(companyId).then((data) => {
      setRoots(data);
      setIsLoading(false);
    });
  }, [companyId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (roots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No contacts with reporting structure. Add manager_id to contacts to build the org chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-1">
          {roots.map((node) => (
            <OrgChartNode key={node.id} node={node} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
