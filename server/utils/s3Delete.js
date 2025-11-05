// backend/utils/s3Delete.js
// Utility to delete images from S3

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS S3 Client v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Delete image from S3 bucket
 * @param {string} imageUrl - The S3 or CloudFront URL of the image
 * @returns {Promise<boolean>} - True if deleted successfully, false otherwise
 */
export async function deleteImageFromS3(imageUrl) {
  if (!imageUrl) {
    console.log("No image URL provided for deletion");
    return true;
  }

  try {
    // Extract the S3 key from the URL
    let s3Key = null;
    
    if (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes(`s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`)) {
      // Direct S3 URL
      const url = new URL(imageUrl);
      s3Key = url.pathname.substring(1); // Remove leading slash
    } else if (imageUrl.includes('cloudfront.net')) {
      // CloudFront URL - convert to S3 key
      const url = new URL(imageUrl);
      s3Key = url.pathname.substring(1); // Remove leading slash
    } else {
      console.log("Invalid image URL format:", imageUrl);
      return false;
    }

    if (!s3Key) {
      console.log("Could not extract S3 key from URL:", imageUrl);
      return false;
    }

    // Delete the object from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "urbanesta-assets",
      Key: s3Key
    });

    await s3Client.send(deleteCommand);
    console.log("Successfully deleted image from S3:", s3Key);
    return true;

  } catch (error) {
    console.error("Error deleting image from S3:", error);
    return false;
  }
}

/**
 * Delete multiple images from S3 bucket
 * @param {string[]} imageUrls - Array of S3 or CloudFront URLs
 * @returns {Promise<boolean>} - True if all deleted successfully, false otherwise
 */
export async function deleteMultipleImagesFromS3(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return true;
  }

  try {
    const deletePromises = imageUrls.map(url => deleteImageFromS3(url));
    const results = await Promise.all(deletePromises);
    
    const allDeleted = results.every(result => result === true);
    console.log(`Deleted ${results.filter(r => r).length}/${imageUrls.length} images from S3`);
    
    return allDeleted;
  } catch (error) {
    console.error("Error deleting multiple images from S3:", error);
    return false;
  }
}
