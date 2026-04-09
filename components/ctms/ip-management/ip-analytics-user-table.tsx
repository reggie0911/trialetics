'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserActivityRow } from '@/lib/utils/ip-analytics-metrics';

const BAR_CORNER_RADIUS: [number, number, number, number] = [5, 5, 0, 0];
const BAR_LABEL_FILL = 'hsl(var(--foreground))';

function formatBarLabel(value: unknown): string {
  if (typeof value === 'number' && value > 0) return String(value);
  return '';
}

function truncateLabel(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

interface IpAnalyticsUserTableProps {
  userActivity: UserActivityRow[];
}

export function IpAnalyticsUserTable({ userActivity }: IpAnalyticsUserTableProps) {
  if (userActivity.length === 0) {
    return (
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">User activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No user activity data available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = userActivity.slice(0, 10).map((u) => ({
    name: truncateLabel(u.userName, 16),
    received: u.received,
    dispensed: u.dispensed,
    verified: u.verified,
  }));

  return (
    <div className="space-y-4">
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">User activity leaderboard</CardTitle>
          <CardDescription className="text-xs">Activity across receive, dispense, and verification workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Dispensed</TableHead>
                <TableHead className="text-right">Verified</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userActivity.map((u) => (
                <TableRow key={u.userName}>
                  <TableCell className="font-medium">{u.userName}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.received}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.dispensed}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.verified}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{u.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
        <CardHeader>
          <CardTitle className="text-base">Activity by user</CardTitle>
          <CardDescription className="text-xs">Top users by workflow activity</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 22, right: 8, left: 0, bottom: 56 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} tickMargin={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="received" name="Received" fill="hsl(173 58% 42%)" radius={BAR_CORNER_RADIUS}>
                <LabelList dataKey="received" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
              </Bar>
              <Bar dataKey="dispensed" name="Dispensed" fill="hsl(var(--primary))" radius={BAR_CORNER_RADIUS}>
                <LabelList dataKey="dispensed" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
              </Bar>
              <Bar dataKey="verified" name="Verified" fill="hsl(199 89% 48%)" radius={BAR_CORNER_RADIUS}>
                <LabelList dataKey="verified" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
