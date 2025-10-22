'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EnhancedVariants } from '../../types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { deleteProductByName} from '../../actions';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VariantCardProps {
  variant: EnhancedVariants;
}

export function VariantCard({ variant }: VariantCardProps) {
  const {
    sku,
    attributes,
    retailPrice,
    availableStock,
    image,
    supplier,
    purchasePrice,
    wholesalePrice,
    shippingCost,
    stockOnBackorder,
    productName
  } = variant;

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <div className="relative h-48 bg-gray-100">
        {image ? (
          <Image src={image} alt={`${productName} - ${sku}`} fill className="object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200 text-gray-400">
            <span>No Image</span>
          </div>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-lg">{productName || 'Unnamed Product'}</CardTitle>
        <div className="text-sm text-gray-500">SKU: {sku}</div>
        {supplier && <div className="text-sm text-gray-500">Supplier: {supplier}</div>}
      </CardHeader>

      <CardContent>
        {Object.entries(attributes || {}).map(([key, value]) => (
          <div key={key} className="text-sm mb-1">
            <span className="font-medium capitalize">{key.split('_').pop()}:</span>{' '}
            <span className="text-gray-600">{value}</span>
          </div>
        ))}

        <div className="mt-4 bg-gray-50 p-1 rounded">
          <div>
            <span className="font-semibold">Purchase price:</span> {purchasePrice}
          </div>
          <div>
            <span className="font-semibold">Wholesale price:</span> {wholesalePrice}
          </div>
          <div>
            <span className="font-semibold">Shipping cost:</span> {shippingCost}
          </div>
          <div>
            <span className="font-semibold">Stock on backorder:</span> <Badge>{stockOnBackorder}</Badge>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-lg font-semibold">Rs. {retailPrice?.toFixed(2)}</div>
          <div
            className={`px-2 py-1 text-sm rounded ${
              availableStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {availableStock > 0 ? `In Stock (${availableStock})` : 'Out of Stock'}
          </div>
        </div>
        <Button variant="destructive" className="w-full mt-4" onClick={() => deleteProductByName(productName)}>
          <Trash2 />
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
