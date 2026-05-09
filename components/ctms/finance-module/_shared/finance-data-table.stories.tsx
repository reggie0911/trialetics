import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';

type Row = { id: string; label: string; amount: number };

const meta: Meta<typeof FinanceDataTable<Row>> = {
  title: 'Finance/_shared/FinanceDataTable',
  component: FinanceDataTable,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FinanceDataTable<Row>>;

function TableDemo(args: Story['args']) {
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'label', header: 'Name' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => <span className="tabular-nums">{row.original.amount}</span>,
      },
    ],
    [],
  );
  const data: Row[] = [
    { id: '1', label: 'Alpha', amount: 1200 },
    { id: '2', label: 'Beta', amount: 450 },
  ];
  return (
    <FinanceDataTable<Row>
      {...args}
      urlPrefix="fmt_story"
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      urlSync={false}
    />
  );
}

export const Populated: Story = {
  render: (args) => <TableDemo {...args} />,
};

function TableEmptyDemo(args: Story['args']) {
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'label', header: 'Name' },
      { accessorKey: 'amount', header: 'Amount' },
    ],
    [],
  );
  return (
    <FinanceDataTable<Row>
      {...args}
      urlPrefix="fmt_story_e"
      columns={columns}
      data={[]}
      getRowId={(r) => r.id}
      urlSync={false}
    />
  );
}

export const Empty: Story = {
  render: (args) => <TableEmptyDemo {...args} />,
};
