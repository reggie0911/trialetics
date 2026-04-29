'use client';

export function VisitsPageHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">Site Visits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan and track on-site monitoring visits, use table and calendar views, and manage
          trip reports to closure.
        </p>
      </div>
    </div>
  );
}
