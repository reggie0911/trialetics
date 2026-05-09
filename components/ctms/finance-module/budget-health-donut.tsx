'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BudgetHealthDonutProps {
  health: { onTrack: number; atRisk: number; overBudget: number };
}

export function BudgetHealthDonut({ health }: BudgetHealthDonutProps) {
  const data = [
    { name: 'On Track', value: health.onTrack, fill: 'hsl(142 71% 45%)' },
    { name: 'At Risk', value: health.atRisk, fill: 'hsl(38 92% 50%)' },
    { name: 'Over Budget', value: health.overBudget, fill: 'hsl(0 72% 56%)' },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            Add categories and line items to see budget health.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex flex-col gap-2 text-xs">
              {data.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-foreground">{entry.name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {entry.value} {entry.value === 1 ? 'category' : 'categories'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
