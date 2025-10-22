import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    console.log("DELETE API WAS HIT")

    if (!publicId) {
      return NextResponse.json(
        { message: 'Missing publicId parameter' },
        { status: 400 }
      );
    }

    // Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'not found') {
      return NextResponse.json(
        { message: 'Image not found in Cloudinary' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return NextResponse.json(
      { message: 'Failed to delete image from Cloudinary' },
      { status: 500 }
    );
  }
}
