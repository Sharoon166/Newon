import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/general/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requirePermission } from '@/lib/auth-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getSupplierById, getSupplierLedger } from '@/features/suppliers/actions';
import { SupplierLedgerCard } from '@/features/suppliers/components/supplier-ledger-card';
import { getCountryName } from '@/lib/countries';
import { getAllPurchases } from '@/features/purchases/actions';
import type { Purchase } from '@/features/purchases/types';
import { ArrowUpRight, Building2, Mail, MapPin, Pencil, Phone } from 'lucide-react';

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

const PURCHASES_SHOWN = 25;
const LEDGER_ENTRIES_SHOWN = 15;

// getAllPurchases serializes the joined product name and variant details onto
// each row; PaginatedPurchases' docs don't carry those fields.
type PurchaseWithProduct = Purchase & {
  productName?: string;
  variant?: { id: string; sku: string; attributes?: Record<string, string> };
};

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{value || '—'}</div>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-orange-600' : ''}`}>{value}</span>
    </div>
  );
}

function PaymentBadge({ purchase }: { purchase: Purchase }) {
  if (purchase.isUntracked) {
    return (
      <Badge variant="default" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-600">
        Paid
      </Badge>
    );
  }
  if (purchase.paymentStatus === 'paid') {
    return (
      <Badge variant="default" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-600">
        Paid
      </Badge>
    );
  }
  if (purchase.paymentStatus === 'partial') {
    return (
      <Badge variant="secondary" className="whitespace-nowrap bg-amber-100 text-amber-800 hover:bg-amber-100">
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      Unpaid
    </Badge>
  );
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  await requirePermission('view:suppliers');

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const [purchasesData, ledger] = await Promise.all([
    getAllPurchases({
      supplierId: supplier.supplierId,
      supplier: supplier.name,
      limit: PURCHASES_SHOWN
    }),
    getSupplierLedger(supplier.supplierId || supplier.id, { limit: LEDGER_ENTRIES_SHOWN })
  ]);
  const purchases = purchasesData.docs as PurchaseWithProduct[];

  const locationLine = [supplier.address, [supplier.city, supplier.state].filter(Boolean).join(', '), supplier.zip]
    .filter(Boolean)
    .join(' · ');

  const editHref = `/suppliers/${supplier.supplierId || supplier.id}/edit`;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={supplier.name}
        description={[supplier.supplierId ? `Supplier ID: ${supplier.supplierId}` : null, supplier.company]
          .filter(Boolean)
          .join(' · ')}
        backLink="/suppliers"
      >
        <div className="flex items-center gap-2">
          {supplier.disabled && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Disabled
            </Badge>
          )}
          <Button asChild>
            <Link href={editHref}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Supplier
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={supplier.email} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={supplier.phone} />
              <InfoItem icon={<Building2 className="h-4 w-4" />} label="Company" value={supplier.company} />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="Address" value={locationLine} />
            </CardContent>
          </Card>

          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Purchases</CardTitle>
              <Button variant="outline" size="sm" asChild>
                {/* Pass the supplier id so the filter matches rows even after a
                    rename (purchases store an old name snapshot); the name is
                    kept as a fallback for legacy rows without a supplierId. */}
                <Link
                  href={`/purchases?supplierId=${encodeURIComponent(supplier.supplierId || supplier.id)}&supplier=${encodeURIComponent(supplier.name)}`}
                  className='inline-flex items-center gap-1'
                >
                  View all purchases <ArrowUpRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No purchases recorded for this supplier yet.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Purchase</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map(purchase => {
                        const balance = purchase.balanceAmount ?? 0;
                        return (
                          <TableRow key={purchase.id || purchase._id}>
                            <TableCell className="whitespace-nowrap">{formatDate(purchase.purchaseDate)}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs">{purchase.purchaseId || 'N/A'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{purchase.productName || 'Unknown Product'}</div>
                              {purchase.variant?.sku && (
                                <div className="text-xs text-muted-foreground font-mono">{purchase.variant.sku}</div>
                              )}
                            </TableCell>
                            <TableCell>{purchase.quantity}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(purchase.totalCost)}</TableCell>
                            <TableCell>{formatCurrency(purchase.paidAmount || 0)}</TableCell>
                            <TableCell className={balance > 0 ? 'font-medium text-orange-600' : ''}>
                              {formatCurrency(balance)}
                            </TableCell>
                            <TableCell>
                              <PaymentBadge purchase={purchase} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {purchasesData.totalDocs > PURCHASES_SHOWN && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Showing latest {PURCHASES_SHOWN} of {purchasesData.totalDocs} purchases.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <SupplierLedgerCard ledger={ledger} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow label="Total Purchased" value={formatCurrency(supplier.totalPurchased)} />
              <StatRow label="Total Paid" value={formatCurrency(supplier.totalPaid)} />
              <StatRow
                label="Outstanding Balance"
                value={formatCurrency(supplier.outstandingBalance)}
                highlight={(supplier.outstandingBalance ?? 0) > 0}
              />
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last purchase</span>
                  <span>{supplier.lastPurchaseDate ? formatDate(supplier.lastPurchaseDate) : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last payment</span>
                  <span>{supplier.lastPaymentDate ? formatDate(supplier.lastPaymentDate) : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {supplier.disabled ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Disabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Supplier ID</span>
                <span className="font-mono text-xs">{supplier.supplierId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Country</span>
                <span>{getCountryName(supplier.country || 'PK')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Added on</span>
                <span>{supplier.createdAt ? formatDate(supplier.createdAt) : '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
