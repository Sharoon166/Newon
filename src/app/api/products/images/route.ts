import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';

export async function POST(request: NextRequest) {
  try {
    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds)) {
      return NextResponse.json({ error: 'Invalid variant IDs' }, { status: 400 });
    }

    await dbConnect();

    const products = await ProductModel.find(
      { 'variants.id': { $in: variantIds } },
      { variants: 1 }
    ).lean();

    const imageMap: Record<string, string | null> = {};
    for (const variantId of variantIds) {
      imageMap[variantId] = null;
    }

    for (const product of products) {
      for (const variant of product.variants || []) {
        if (variantIds.includes(variant.id)) {
          imageMap[variant.id] = variant.imageFile?.cloudinaryUrl || variant.image || null;
        }
      }
    }

    return NextResponse.json(imageMap);
  } catch (error) {
    console.error('Error fetching product images:', error);
    return NextResponse.json({ error: 'Failed to fetch product images' }, { status: 500 });
  }
}
