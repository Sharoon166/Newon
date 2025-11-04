// import type { DeleteApiResponse, UploadApiErrorResponse, UploadApiOptions, UploadApiResponse } from "cloudinary";
// import { cloudinary } from "./config";


// type UploadResponse = 
//   { success: true; result?: UploadApiResponse } | 
//   { success: false; error: UploadApiErrorResponse };

// export const uploadToCloudinary = (
//   fileUri: string, fileName: string): Promise<UploadResponse> => {
//   return new Promise((resolve, reject) => {
//     cloudinary.uploader
//       .upload(fileUri, {
//         invalidate: true,
//         resource_type: "auto",
//         filename_override: fileName,
//         folder: "product-images", // any sub-folder name in your cloud
//         use_filename: true,
//       })
//       .then((result) => {
//         resolve({ success: true, result });
//       })
//       .catch((error) => {
//         reject({ success: false, error });
//       });
//   });
// };

// type DeleteResponse = 
//   | { success: true; result: DeleteApiResponse }
//   | { success: false; error: Error | unknown };

// export const deleteFromCloudinary = async (
//   publicIds: string | string[],
//   options: UploadApiOptions = {}
// ): Promise<DeleteResponse> => {
//   try {
//     // Convert single publicId to array if needed
//     const ids = Array.isArray(publicIds) ? publicIds : [publicIds];
    
//     // Delete resources
//     const result = await cloudinary.api.delete_resources(ids, options);
    
//     return { success: true, result };
//   } catch (error) {
//     console.error('Error deleting from Cloudinary:', error);
//     return { success: false, error };
//   }
// };

