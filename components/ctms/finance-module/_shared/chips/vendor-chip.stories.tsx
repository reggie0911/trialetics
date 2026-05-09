import type { Meta, StoryObj } from '@storybook/react';

import { VendorChip } from '@/components/ctms/finance-module/_shared/chips/vendor-chip';

const meta: Meta<typeof VendorChip> = {
  title: 'Finance/_shared/chips/VendorChip',
  component: VendorChip,
};

export default meta;

type Story = StoryObj<typeof VendorChip>;

export const Default: Story = {
  args: {
    studyId: '00000000-0000-4000-8000-000000000001',
    vendorId: '00000000-0000-4000-8000-000000000002',
    label: 'Acme Clinical Labs',
  },
};
