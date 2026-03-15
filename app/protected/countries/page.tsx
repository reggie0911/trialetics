import { getAllCountries } from '@/lib/actions/countries';
import { CountryList } from '@/components/ctms/countries/country-list';

export default async function CountriesPage() {
  const countries = await getAllCountries();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Countries</h1>
        <p className="text-muted-foreground">
          Country-level regulatory tracking across all studies.
        </p>
      </div>
      <CountryList countries={countries} />
    </div>
  );
}
