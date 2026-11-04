import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';

export async function POST(request: NextRequest) {
  try {
    const { variants } = await request.json();

    if (
      !Array.isArray(variants) ||
      variants.some(
        variant =>
          !variant || typeof variant.productId !== 'string' || typeof variant.variantId !== 'string'
      )
    ) {
      return NextResponse.json({ error: 'Invalid product variants' }, { status: 400 });
    }

    await dbConnect();

    const requestedKeys = new Set(
      variants.map((variant: { productId: string; variantId: string }) =>
        JSON.stringify([variant.productId, variant.variantId])
      )
    );
    const variantIds = [...new Set(variants.map((variant: { variantId: string }) => variant.variantId))];

    const products = await ProductModel.find(
      { 'variants.id': { $in: variantIds } },
      { variants: 1 }
    ).lean();

    const imageMap = new Map<string, string | null>();
    for (const variant of variants as { productId: string; variantId: string }[]) {
      imageMap.set(JSON.stringify([variant.productId, variant.variantId]), null);
    }

    for (const product of products) {
      for (const variant of product.variants || []) {
        const key = JSON.stringify([String(product._id), variant.id]);
        if (requestedKeys.has(key)) {
          imageMap.set(key, variant.imageFile?.cloudinaryUrl || variant.image || null);
        }
      }
    }

    return NextResponse.json(Object.fromEntries(imageMap));
  } catch (error) {
    console.error('Error fetching product images:', error);
    return NextResponse.json({ error: 'Failed to fetch product images' }, { status: 500 });
  }
}
