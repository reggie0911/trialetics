import { getPortfolioFinancials } from '@/lib/actions/financials';
import { FinancialsOverview } from '@/components/ctms/financials/financials-overview';

export default async function FinancialsPage() {
  const { studies, totals } = await getPortfolioFinancials();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financials</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-level financial overview across all studies.
        </p>
      </div>
      <FinancialsOverview studies={studies} totals={totals} />
    </div>
  );
}
