import { getCustomerLedgers } from '@/features/ledger/actions';
import { PrintableLedgerTableWithPrint } from '@/features/ledger/components/printable-ledger-table-with-print';

export default async function PrintLedgerPage() {
  const ledgersData = await getCustomerLedgers({ limit: 1000 });

  return (
    <div className="py-10 print:py-0 print:m-0 print:p-0">
      <PrintableLedgerTableWithPrint data={ledgersData.docs} />
    </div>
  );
}
