import { getCustomerLedgers } from '@/features/ledger/actions';
import { PrintableLedgerTableWithPrint } from '@/features/ledger/components/printable-ledger-table-with-print';

export default async function PrintLedgerPage() {
  const ledgersData = await getCustomerLedgers({ limit: 1000 });

  return (
    <div className="py-10">
      <PrintableLedgerTableWithPrint data={ledgersData.docs} />
    </div>
  );
}
