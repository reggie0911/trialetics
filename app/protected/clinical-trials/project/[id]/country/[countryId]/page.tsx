import { CountryDetailPage } from '@/components/clinical-trials/country-detail-page';

interface CountryPageProps {
  params: Promise<{ id: string; countryId: string }>;
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { id, countryId } = await params;
  return <CountryDetailPage projectId={id} countryId={countryId} />;
}
