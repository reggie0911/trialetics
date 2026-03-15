import { getSubscription, getCompanyMemberCount } from '@/lib/actions/subscriptions';
import { BillingPage } from '@/components/ctms/billing/billing-page';

export default async function BillingSettingsPage() {
  const [subscription, memberCount] = await Promise.all([
    getSubscription(),
    getCompanyMemberCount(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription plan, seats, and billing information.
        </p>
      </div>
      <BillingPage subscription={subscription} memberCount={memberCount} />
    </div>
  );
}
