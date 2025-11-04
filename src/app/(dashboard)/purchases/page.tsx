import { PageHeader } from '@/components/general/page-header';
import { getAllPurchases } from '@/features/purchases/actions';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { PurchasesTable } from '@/features/purchases/components/purchases-table-overview';

// // Type for the purchase data
interface PurchaseData {
  _id: string;
  variantId?: string;
  locationId?: string;
  productId?: string;
  purchaseDate?: Date;
  quantity?: number;
  unitPrice?: number;
  totalCost?: number;
  remaining?: number;
  supplier?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  variant?: {
    _id?: string;
    productId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    // [key: string]: string;
  };
  product?: {
    _id?: string;
    name?: string;
    sku?: string;
    // Add other product fields as needed
  };
}

// Helper function to serialize MongoDB documents
const serializePurchase = (purchase: PurchaseData) => {
  return {
    ...purchase,
    _id: purchase._id?.toString(),
    variantId: purchase.variantId?.toString(),
    locationId: purchase.locationId?.toString(),
    productId: purchase.productId?.toString(),
    purchaseDate: purchase.purchaseDate?.toISOString(),
    createdAt: purchase.createdAt?.toISOString(),
    updatedAt: purchase.updatedAt?.toISOString(),
    quantity: purchase.quantity,
    unitPrice: purchase.unitPrice,
    totalCost: purchase.totalCost,
    remaining: purchase.remaining,
    supplier: purchase.supplier,
    variant: purchase.variant ? {
      ...purchase.variant,
      _id: purchase.variant._id?.toString(),
      productId: purchase.variant.productId?.toString(),
      createdAt: purchase.variant.createdAt?.toISOString(),
      updatedAt: purchase.variant.updatedAt?.toISOString(),
    } : undefined
  };
};

export default async function PurchasesPage() {
  // const purchases = (await getAllPurchases()).map(serializePurchase);
  const purchases = (await getAllPurchases());

  // Calculate statistics
  const totalPurchased = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const avgUnitPrice = purchases.length > 0
    ? purchases.reduce((sum, p) => sum + (p.unitPrice || 0), 0) / purchases.length
    : 0;
  const uniqueSuppliers = new Set(purchases.map(p => p.supplier)).size;
  // const uniqueProducts = new Set(purchases.map(p => p.productId)).size;

  return (
    <>
      <PageHeader
        title="Purchase History"
        description="View all purchase records across all product variants"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Purchases
          </CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">
            {purchases.length.toLocaleString()}
          </CardContent>
        </Card>
        
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Quantity
          </CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">
            {totalPurchased.toLocaleString()}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cost
          </CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">
            {formatCurrency(totalCost)}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Unit Price
          </CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">
            {formatCurrency(avgUnitPrice)}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Suppliers
          </CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">
            {uniqueSuppliers}
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <div className="mt-6">
        <PurchasesTable purchases={purchases} />
      </div>
    </>
  );
}

