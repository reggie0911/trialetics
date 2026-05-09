import type { Meta, StoryObj } from '@storybook/react';

import { FinanceEntityDetailSheet } from '@/components/ctms/finance-module/_shared/entity-detail-sheet';

/**
 * With `studyId` empty, comments/audit/signed-url queries stay disabled so Storybook
 * does not call server actions. Use a real study id only with a live backend.
 */
const meta: Meta<typeof FinanceEntityDetailSheet> = {
  title: 'Finance/_shared/EntityDetailSheet',
  component: FinanceEntityDetailSheet,
  decorators: [
    (Story) => (
      <div className="min-h-[520px] bg-muted/30 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FinanceEntityDetailSheet>;

const noop = () => {};

export const OverviewOpen: Story = {
  args: {
    open: true,
    onOpenChange: noop,
    studyId: '',
    entityType: 'invoice',
    entityId: '00000000-0000-4000-8000-000000000099',
    title: 'Invoice INV-2048',
    overview: (
      <div className="space-y-2 text-foreground">
        <p className="font-medium">Draft · USD 12,400.00</p>
        <p className="text-muted-foreground">Vendor: Acme Clinical Labs</p>
      </div>
    ),
  },
};

export const WithRelatedTab: Story = {
  args: {
    ...OverviewOpen.args,
    title: 'Purchase order PO-12',
    related: (
      <div className="rounded-md border border-border/80 p-2 text-muted-foreground">
        Linked budget lines and receiving milestones appear here in the app.
      </div>
    ),
  },
};

export const AttachmentsNoFile: Story = {
  args: {
    ...OverviewOpen.args,
    title: 'Contract CTR-3',
    attachments: {
      kind: 'contract',
      contractId: '00000000-0000-4000-8000-000000000088',
      storagePath: null,
      rowUpdatedAt: new Date().toISOString(),
      allowMutate: false,
    },
  },
};

export const CommentsReadOnlyNoUser: Story = {
  args: {
    ...OverviewOpen.args,
    title: 'Site payment',
    currentUserId: null,
  },
};
