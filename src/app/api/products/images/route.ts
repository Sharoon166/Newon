import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';

interface ProductVariant {
  id: string;
  image?: string;
  imageFile?: {
    cloudinaryUrl?: string;
  };
}

interface ProductWithVariants {
  variants: ProductVariant[];
}

export async function POST(request: NextRequest) {
  try {
    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds)) {
      return NextResponse.json({ error: 'Invalid variant IDs' }, { status: 400 });
    }

    await dbConnect();

    const imageMap: Record<string, string | null> = {};

    // Fetch images for each variant
    for (const variantId of variantIds) {
      try {
        const product = await ProductModel.findOne(
          { 'variants.id': variantId },
          { 'variants.$': 1 }
        ).lean() as ProductWithVariants | null;

        if (product && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          const variant = product.variants[0];
          const imageUrl = variant.imageFile?.cloudinaryUrl || variant.image || null;
          imageMap[variantId] = imageUrl;
        } else {
          imageMap[variantId] = null;
        }
      } catch (error) {
        console.warn(`Failed to fetch image for variant ${variantId}:`, error);
        imageMap[variantId] = null;
      }
    }

    return NextResponse.json(imageMap);
  } catch (error) {
    console.error('Error fetching product images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product images' },
      { status: 500 }
    );
  }
}
