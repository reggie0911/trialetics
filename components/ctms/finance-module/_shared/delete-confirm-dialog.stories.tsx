import type { Meta, StoryObj } from '@storybook/react';

import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';

const noop = () => {};

const meta: Meta<typeof FinanceDeleteConfirmDialog> = {
  title: 'Finance/_shared/DeleteConfirmDialog',
  component: FinanceDeleteConfirmDialog,
};

export default meta;

type Story = StoryObj<typeof FinanceDeleteConfirmDialog>;

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: noop,
    title: 'Delete draft invoice?',
    description: 'This removes the invoice and its line items. Only drafts without payments can be deleted.',
    onConfirm: noop,
  },
};

export const StaleRecordConflict: Story = {
  args: {
    open: true,
    onOpenChange: noop,
    title: 'Could not delete',
    description:
      'Someone else changed this record after you opened it. Refresh the page to load the latest version, then try again if it is still safe to delete.',
    confirmLabel: 'OK',
    destructive: false,
    onConfirm: noop,
  },
};
