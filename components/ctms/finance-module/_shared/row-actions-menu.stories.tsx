import type { Meta, StoryObj } from '@storybook/react';

import { FinanceRowActionsMenu } from '@/components/ctms/finance-module/_shared/row-actions-menu';

const noop = () => {};

const meta: Meta<typeof FinanceRowActionsMenu> = {
  title: 'Finance/_shared/RowActionsMenu',
  component: FinanceRowActionsMenu,
};

export default meta;

type Story = StoryObj<typeof FinanceRowActionsMenu>;

export const Default: Story = {
  args: {
    ariaLabel: 'Demo row actions',
    items: [
      { id: 'edit', label: 'Edit', onSelect: noop },
      { id: 'dup', label: 'Duplicate', onSelect: noop },
      { id: 'del', label: 'Delete', variant: 'destructive', onSelect: noop },
    ],
  },
};

export const PermissionDenied: Story = {
  args: {
    items: [
      { id: 'edit', label: 'Edit', disabled: true, disabledReason: 'Read-only study', onSelect: noop },
    ],
  },
};

export const StaleRecord: Story = {
  args: {
    items: [
      {
        id: 'edit',
        label: 'Save changes',
        disabled: true,
        disabledReason: 'This record was updated elsewhere. Refresh the page, then try again.',
        onSelect: noop,
      },
      { id: 'view', label: 'View history', onSelect: noop },
    ],
  },
};

export const WithTelemetry: Story = {
  args: {
    telemetryContext: {
      studyId: '00000000-0000-4000-8000-000000000001',
      tableKey: 'fm_invoices',
      entityType: 'invoice',
    },
    items: [
      { id: 'edit', label: 'Edit', onSelect: noop },
      { id: 'export', label: 'Export row', onSelect: noop },
    ],
  },
};
