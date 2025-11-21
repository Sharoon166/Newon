import { getCustomerLedgers, getLedgerSummary } from '@/features/ledger/actions';
import { LedgerTable } from '@/features/ledger/components/ledger-table';
import { LedgerSummaryCards } from '@/features/ledger/components/ledger-summary';
import { PageHeader } from '@/components/general/page-header';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const [ledgersData, summary] = await Promise.all([
    getCustomerLedgers(),
    getLedgerSummary()
  ]);

  const ledgers = ledgersData.docs;

  return (
    <div className="space-y-6">
      <PageHeader title="Ledger Management" description="Track customer transactions, payments, and outstanding balances" />

      <LedgerSummaryCards summary={summary} />

      <div className="sm:px-6">
        <LedgerTable data={ledgers} />
      </div>
    </div>
  );
}
