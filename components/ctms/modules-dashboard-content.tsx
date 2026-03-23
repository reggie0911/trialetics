'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, FolderOpen, LayoutGrid } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { studyTrackerNavItems } from '@/lib/nav/study-trackers';

export type ModulesDashboardCustomItem = { id: string; name: string; slug: string };

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function ModulesDashboardContent({
  firstName,
  hasEtmfAccess,
  hasEisfAccess,
  studyTrackerMenuKeys,
  customTrackers,
}: {
  firstName: string | null;
  hasEtmfAccess: boolean;
  hasEisfAccess: boolean;
  studyTrackerMenuKeys: string[];
  customTrackers: ModulesDashboardCustomItem[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const studyItems = studyTrackerNavItems.filter((i) => studyTrackerMenuKeys.includes(i.key));
  const hasAnyModule =
    hasEtmfAccess || studyItems.length > 0 || customTrackers.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8" suppressHydrationWarning>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" suppressHydrationWarning>
          {mounted ? getGreeting() : 'Hello'}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a module below to get started. Use the top navigation for quick access anytime.
        </p>
      </div>

      {!hasAnyModule ? (
        <Card>
          <CardHeader>
            <CardTitle>No modules visible</CardTitle>
            <CardDescription>
              Your organization does not have eTMF, eISF, or study trackers enabled. Contact your Trialetics
              administrator if you need access.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasEtmfAccess && (
            <Link href="/protected/etmf" className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">eTMF</CardTitle>
                  </div>
                  <CardDescription>Electronic trial master file</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {hasEisfAccess && (
            <Link href="/protected/eisf" className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">eISF</CardTitle>
                  </div>
                  <CardDescription>Investigator site folders and site documents</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {studyItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{item.label}</CardTitle>
                  </div>
                  <CardDescription>Study tracker</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}

          {customTrackers.map((t) => (
            <Link
              key={t.id}
              href={`/protected/custom-trackers/${t.slug}`}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </div>
                  <CardDescription>Custom tracker</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}

          {customTrackers.length > 0 && (
            <Link
              href="/protected/custom-trackers"
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">All custom trackers</CardTitle>
                  </div>
                  <CardDescription>Browse definitions</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
