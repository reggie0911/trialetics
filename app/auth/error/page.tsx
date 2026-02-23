import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page(
  props: {
    params?: Promise<Record<string, string | string[]>>;
    searchParams: Promise<{ error?: string }>;
  }
) {
  const params = await props.params;
  const resolvedSearchParams = await props.searchParams;
  if (props.params) await props.params;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              {resolvedSearchParams?.error ? (
                <p className="text-sm text-muted-foreground">Code error: {resolvedSearchParams.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground">An unspecified error occurred.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
