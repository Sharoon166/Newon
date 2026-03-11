import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getProjectStaffFinances } from '../actions';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface StaffFinancesProps {
  projectId: string;
}

function CircularProgress({ value }: { value: number }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2; // 21
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const trackColor = 'stroke-muted';
  const progressColor =
    clamped === 100 ? 'stroke-green-600' : clamped > 0 ? 'stroke-blue-600' : 'stroke-muted-foreground/40';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${trackColor}`}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          style={{ opacity: 0.25 }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${progressColor}`}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className="absolute text-xs font-medium">{clamped.toFixed(1)}%</div>
    </div>
  );
}

export default async function StaffFinances({ projectId }: StaffFinancesProps) {
  const rows = await getProjectStaffFinances(projectId);

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.totalAmount;
      acc.paid += r.totalPaid;
      acc.remaining += r.remaining;
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 }
  );

  const paymentRate = totals.total > 0 ? (totals.paid / totals.total) * 100 : 0;

  return (
    <Card className="shadow-none border-none *:px-0!">
      <CardHeader className="space-y-6">
        <div>
          <CardTitle className="text-xl">Staff Finances</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Expenses attributed to team members for this project</p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-right">Total Expenses</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Payment Progress</TableHead>
                <TableHead className="text-right">Entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => {
                const initials =
                  row.staffName
                    .split(' ')
                    .map(p => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'U';
                const paidPct =
                  row.totalAmount > 0 ? Math.min(100, Math.round((row.totalPaid / row.totalAmount) * 100)) : 0;

                return (
                  <TableRow key={row.staffId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{row.staffName}</div>
                          {row.email && <div className="text-sm text-muted-foreground">{row.email}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.totalAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.totalPaid)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.remaining)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <CircularProgress value={paidPct} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.expenseCount}</TableCell>
                  </TableRow>
                );
              })}

              {/* Total Row */}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Total</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.paid)}</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(totals.remaining)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <CircularProgress value={paymentRate} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {rows.reduce((sum, r) => sum + r.expenseCount, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
