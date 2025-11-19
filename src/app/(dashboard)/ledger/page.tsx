import { getCustomerLedgers, getLedgerSummary } from '@/features/ledger/actions';
import { LedgerTable } from '@/features/ledger/components/ledger-table';
import { LedgerSummaryCards } from '@/features/ledger/components/ledger-summary';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const [ledgersData, summary] = await Promise.all([
    getCustomerLedgers(),
    getLedgerSummary()
  ]);

  const ledgers = ledgersData.docs;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl text-primary font-bold tracking-tight">Ledger Management</h2>
          <p className="text-muted-foreground">Track customer transactions, payments, and outstanding balances</p>
        </div>
      </div>

      <LedgerSummaryCards summary={summary} />

      <div className="sm:px-6">
        <LedgerTable data={ledgers} />
      </div>
    </div>
  );
}
