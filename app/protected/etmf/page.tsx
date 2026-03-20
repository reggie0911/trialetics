import { requireEtmfAccess } from '@/lib/actions/etmf-access';

export default async function EtmfPage() {
  await requireEtmfAccess();

  return (
    <div className="container max-w-3xl py-12 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">eTMF</h1>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        Electronic trial master file features will appear here as they are rolled out.
      </p>
    </div>
  );
}
