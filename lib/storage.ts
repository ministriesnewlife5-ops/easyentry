/// <reference types="node" />
import { supabase } from './supabase';

const BUCKET_NAME = 'event-files';

/**
 * Upload a base64 image to Supabase Storage
 * @param base64Data - Base64 encoded image data (can include data:image/... prefix)
 * @param fileName - Desired file name (optional, will generate UUID if not provided)
 * @param folder - Folder path within the bucket (optional)
 * @returns Public URL of the uploaded file
 */
export async function uploadBase64Image(
  base64Data: string,
  fileName?: string,
  folder?: string
): Promise<string> {
  // Extract mime type and base64 content
  let mimeType = 'image/png';
  let base64Content = base64Data;

  if (base64Data.includes(',')) {
    const parts = base64Data.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    base64Content = parts[1];
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Content, 'base64');

  // Generate file path
  const extension = mimeType.split('/')[1] || 'png';
  const name = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const path = folder ? `${folder}/${name}.${extension}` : `${name}.${extension}`;

  // Upload to Supabase
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Upload a file buffer to Supabase Storage
 * @param buffer - File buffer
 * @param fileName - File name with extension
 * @param contentType - MIME type of the file
 * @param folder - Folder path within the bucket (optional)
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<string> {
  const path = folder ? `${folder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param path - File path within the bucket
 */
export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get public URL for a file path
 * @param path - File path within the bucket
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload multiple base64 images
 * @param base64Images - Array of base64 image data
 * @param folder - Folder path within the bucket
 * @returns Array of public URLs
 */
export async function uploadMultipleBase64Images(
  base64Images: string[],
  folder?: string
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < base64Images.length; i++) {
    const url = await uploadBase64Image(base64Images[i], `image-${i}`, folder);
    urls.push(url);
  }

  return urls;
}

/**
 * Extract file path from a public URL
 * Useful for deletion operations
 * @param publicUrl - Full public URL
 * @returns File path within the bucket
 */
export function extractPathFromUrl(publicUrl: string): string | null {
  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`;
  if (publicUrl.startsWith(bucketUrl)) {
    return publicUrl.replace(bucketUrl, '');
  }
  return null;
}
