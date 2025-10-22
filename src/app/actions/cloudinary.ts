'use server';

import { cloudinary } from "@/services/cloudinary/config";

// import { v2 as cloudinary } from 'cloudinary';

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

export async function deleteCloudinaryImage(publicId: string) {
  try {
    if (!publicId) {
      throw new Error('No public ID provided');
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'not found') {
      throw new Error('Image not found in Cloudinary');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}
