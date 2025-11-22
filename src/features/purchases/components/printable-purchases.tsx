'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import { Purchase } from '../types';

interface PurchaseWithProduct extends Purchase {
  productName?: string;
  variant?: {
    sku: string;
  };
}

interface PrintablePurchasesProps {
  data: PurchaseWithProduct[];
  selectedSupplier?: string;
}

export function PrintablePurchases({ data, selectedSupplier }: PrintablePurchasesProps) {
  // Filter data by supplier if specified
  const filteredData = selectedSupplier && selectedSupplier !== 'all' 
    ? data.filter(p => p.supplier === selectedSupplier)
    : data;
  // Calculate summary statistics
  const totalPurchases = filteredData.length;
  const totalQuantity = filteredData.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = filteredData.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const uniqueSuppliers = new Set(filteredData.map(p => p.supplier)).size;
  const totalRemaining = filteredData.reduce((sum, p) => sum + (p.remaining || 0), 0);

  // Group purchases by supplier for better organization
  const purchasesBySupplier = filteredData.reduce((acc, purchase) => {
    const supplier = purchase.supplier || 'Unknown Supplier';
    if (!acc[supplier]) {
      acc[supplier] = [];
    }
    acc[supplier].push(purchase);
    return acc;
  }, {} as Record<string, PurchaseWithProduct[]>);

  const suppliers = Object.keys(purchasesBySupplier).sort();

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          table {
            width: 100% !important;
          }
        }
        @media screen {
          body {
            background-color: #f5f5f5;
          }
        }
      `}</style>

      <div className="w-full max-w-[297mm] mx-auto bg-white print:shadow-none py-8 px-10 print:px-0 print:py-0 print:max-w-full purchases-page">
        <div className="purchases-content space-y-6 print:space-y-4">
          {/* Header */}
          <div className="border-b-4 border-gray-900 pb-6 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">PURCHASE HISTORY REPORT</h1>
              <p className="text-sm text-gray-600">Report Date: {formatDate(new Date())}</p>
              {selectedSupplier && selectedSupplier !== 'all' && (
                <p className="text-sm text-gray-600 font-semibold mt-1">Supplier: {selectedSupplier}</p>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-section">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 print:gap-3 print:grid-cols-5">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 print:p-3">
                <p className="text-xs uppercase tracking-wide mb-1 text-gray-600">Total Purchases</p>
                <p className="text-xl font-bold text-gray-900">{totalPurchases.toLocaleString()}</p>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 print:p-3">
                <p className="text-xs uppercase tracking-wide mb-1 text-gray-600">Total Quantity</p>
                <p className="text-xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 print:p-3">
                <p className="text-xs uppercase tracking-wide mb-1 text-gray-600">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 print:p-3">
                <p className="text-xs uppercase tracking-wide mb-1 text-gray-600">Remaining Stock</p>
                <p className="text-xl font-bold text-gray-900">{totalRemaining.toLocaleString()}</p>
              </div>

              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 print:p-3">
                <p className="text-xs uppercase tracking-wide mb-1 text-gray-600">Suppliers</p>
                <p className="text-xl font-bold text-gray-900">{uniqueSuppliers}</p>
              </div>
            </div>
          </div>

          {/* Purchases by Supplier */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4 section-header">
              <h3 className="text-xl font-bold text-gray-900">Purchase Details by Supplier</h3>
              <p className="text-sm text-gray-500 print:hidden">
                {totalPurchases} purchase{totalPurchases !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-6 print:space-y-4">
              {suppliers.map(supplier => {
                const supplierPurchases = purchasesBySupplier[supplier];
                const supplierTotal = supplierPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
                const supplierQuantity = supplierPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

                return (
                  <div key={supplier} className="supplier-section">
                    {/* Supplier Header */}
                    <div className="bg-gray-50 p-4 border-l-4 border-gray-900 mb-3 print:p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{supplier}</h4>
                          <p className="text-sm text-gray-600">
                            {supplierPurchases.length} purchase{supplierPurchases.length !== 1 ? 's' : ''} • {supplierQuantity.toLocaleString()} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(supplierTotal)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Purchases Table */}
                    <div className="overflow-hidden border-2 border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                          <tr>
                            <th className="text-left p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Date</th>
                            <th className="text-left p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Product</th>
                            <th className="text-left p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Variant</th>
                            <th className="text-right p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Quantity</th>
                            <th className="text-right p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Remaining</th>
                            <th className="text-right p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Unit Price</th>
                            <th className="text-right p-3 print:p-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierPurchases.map((purchase, index) => (
                            <tr
                              key={purchase.id}
                              className={`purchase-item border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                              <td className="p-3 print:p-2 text-gray-900 font-medium">
                                {formatDate(new Date(purchase.purchaseDate))}
                              </td>
                              <td className="p-3 print:p-2 text-gray-900">
                                {purchase.productName || 'N/A'}
                              </td>
                              <td className="p-3 print:p-2 text-gray-700">
                                {purchase.variant?.sku || purchase.variantId || 'N/A'}
                              </td>
                              <td className="p-3 print:p-2 text-right font-semibold text-gray-900">
                                {purchase.quantity?.toLocaleString() || 0}
                              </td>
                              <td className="p-3 print:p-2 text-right text-gray-700">
                                {purchase.remaining?.toLocaleString() || 0}
                              </td>
                              <td className="p-3 print:p-2 text-right text-gray-900">
                                {formatCurrency(purchase.unitPrice || 0)}
                              </td>
                              <td className="p-3 print:p-2 text-right font-bold text-gray-900">
                                {formatCurrency(purchase.totalCost || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="purchases-footer mt-12 pt-6 border-t-2 border-gray-300 print:mt-8">
          <div className="flex justify-between items-center">
            <div className="text-left space-y-1">
              <p className="text-xs text-gray-500 italic">
                This is a computer-generated report and does not require a signature.
              </p>
              <p className="text-xs text-gray-400">For any queries, please contact the inventory department.</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Generated on {formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
