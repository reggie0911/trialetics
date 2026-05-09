import { BrandBriefWizard } from '@/components/brand-forge/brand-brief-wizard';
import { asResolved } from '@/lib/next/as-resolved';
import { createClient } from '@/lib/server';
import { brandInputsToFormValues, type BFBrandInputs } from '@/lib/types/brand-forge';

interface EditBrandBriefPageProps {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}

export default async function EditBrandBriefPage({ params, searchParams }: EditBrandBriefPageProps) {
  const { projectId } = await asResolved(params);
  const { returnTo } = await asResolved(searchParams ?? {});
  const editSuccessRedirect = returnTo === 'overview' ? 'overview' : 'logos';
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="text-sm text-muted-foreground">Sign in to edit this brief.</div>;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('company_id', profile?.company_id ?? '')
    .single();

  if (!project) {
    return <div className="text-sm text-muted-foreground">Project not found.</div>;
  }

  const { data: inputs } = await supabase
    .from('bf_brand_inputs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!inputs) {
    return <div className="text-sm text-muted-foreground">No brand brief exists for this project.</div>;
  }

  const initialValues = brandInputsToFormValues(inputs as unknown as BFBrandInputs);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-medium">Edit brand brief</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your answers from the original setup. Saving applies to future generation and your brand kit context.
        </p>
      </div>
      <BrandBriefWizard
        mode="edit"
        projectId={projectId}
        initialValues={initialValues}
        editSuccessRedirect={editSuccessRedirect}
      />
    </div>
  );
}
