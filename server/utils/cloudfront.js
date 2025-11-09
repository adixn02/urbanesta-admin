// backend/utils/cloudfront.js
// Utility to convert S3 URLs to CloudFront URLs

import logger from './logger.js';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "https://d8pw2hr56z2an.cloudfront.net";
const S3_BUCKET = process.env.AWS_S3_BUCKET || "urbanesta-realtors";

/**
 * Convert S3 URL to CloudFront URL
 * @param {string} s3Url - The S3 URL
 * @returns {string} - The CloudFront URL
 */
export function convertToCloudFrontUrl(s3Url) {
  if (!s3Url) return s3Url;
  
  // If it's already a CloudFront URL, return as is
  if (s3Url.includes('cloudfront.net')) {
    return s3Url;
  }
  
  // If it's an S3 URL, convert to CloudFront
  if (s3Url.includes('s3.amazonaws.com') || s3Url.includes(`s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`)) {
    try {
      const url = new URL(s3Url);
      const pathname = url.pathname;
      
      // Remove leading slash and extract the key
      let key = pathname.substring(1);
      
      // Handle path-style URLs where bucket name is in the path
      if (key.startsWith(`${S3_BUCKET}/`)) {
        key = key.substring(`${S3_BUCKET}/`.length);
      }
      
      // Check if the key starts with the expected path
      if (key.startsWith('img-assets/')) {
        return `${CLOUDFRONT_DOMAIN}/${key}`;
      }
    } catch (error) {
      logger.error('Error converting S3 URL to CloudFront:', { error: error.message });
    }
  }
  
  // If it's a local upload URL, convert to CloudFront
  if (s3Url.startsWith('/uploads/img-assets-')) {
    const filename = s3Url.replace('/uploads/img-assets-', '');
    return `${CLOUDFRONT_DOMAIN}/img-assets/${filename}`;
  }
  
  // If it's not an S3 URL, return as is
  return s3Url;
}

/**
 * Convert CloudFront URL back to S3 URL (if needed)
 * @param {string} cloudfrontUrl - The CloudFront URL
 * @returns {string} - The S3 URL
 */
export function convertToS3Url(cloudfrontUrl) {
  if (!cloudfrontUrl) return cloudfrontUrl;
  
  // If it's already an S3 URL, return as is
  if (cloudfrontUrl.includes('s3.amazonaws.com') || cloudfrontUrl.includes(`s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`)) {
    return cloudfrontUrl;
  }
  
  // If it's a CloudFront URL, convert to S3
  if (cloudfrontUrl.includes('cloudfront.net')) {
    try {
      const url = new URL(cloudfrontUrl);
      const key = url.pathname.substring(1); // Remove leading slash
      const region = process.env.AWS_REGION || 'ap-south-1';
      return `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      logger.error('Error converting CloudFront URL to S3:', { error: error.message });
    }
  }
  
  // If it's not a CloudFront URL, return as is
  return cloudfrontUrl;
}
