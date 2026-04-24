import { requireBrandforgeAccess } from '@/lib/server/require-brandforge-access';
import { BrandForgeSubnav } from '@/components/brand-forge/brand-forge-subnav';

export default async function StudyBrandForgeLayout({ children }: { children: React.ReactNode }) {
  await requireBrandforgeAccess();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">BrandForge</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate compliant, professional study identity systems for clinical trials, research programs, and recruitment campaigns.
        </p>
      </div>
      <BrandForgeSubnav />
      {children}
    </div>
  );
}
