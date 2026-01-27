import { SupabaseClient } from "@supabase/supabase-js";
import path from "path";

// Each organization has its own bucket: reports-{org-slug}
function getBucketName(orgSlug: string): string {
  // Sanitize org slug to prevent bucket name manipulation
  const safeSlug = sanitizePathComponent(orgSlug);
  return `reports-${safeSlug}`;
}

/**
 * Sanitize a path component to prevent path traversal attacks
 * - Removes path separators (/, \, ..)
 * - Removes null bytes
 * - Limits length
 * - Only allows safe characters
 */
function sanitizePathComponent(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'unknown';
  }

  return input
    // Remove null bytes (can bypass some security checks)
    .replace(/\0/g, '')
    // Remove path traversal sequences
    .replace(/\.\./g, '')
    .replace(/\.\//g, '')
    .replace(/\.\\/, '')
    // Remove path separators
    .replace(/[/\\]/g, '_')
    // Only keep alphanumeric, dash, underscore, dot
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove leading/trailing dots (hidden files, extension tricks)
    .replace(/^\.+|\.+$/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Limit length to prevent issues
    .substring(0, 200)
    // Ensure not empty after sanitization
    || 'file';
}

/**
 * Validate and sanitize a complete file path
 * Prevents path traversal and ensures the path stays within expected bounds
 */
function sanitizeFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Normalize the path to resolve any .. or . segments
  const normalized = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.startsWith('\\')) {
    throw new Error('Invalid file path: path traversal detected');
  }

  // Split into components and sanitize each
  const parts = normalized.split(/[/\\]/).filter(Boolean);
  const safeParts = parts.map(sanitizePathComponent);

  return safeParts.join('/');
}

export interface UploadResult {
  success: boolean;
  path?: string;
  bucket?: string;
  url?: string;
  error?: string;
}

/**
 * Upload a file to the organization's storage bucket
 */
export async function uploadFile(
  supabase: SupabaseClient,
  orgSlug: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    const bucketName = getBucketName(orgSlug);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const safeFileName = sanitizePathComponent(fileName);
    const storagePath = `${timestamp}-${safeFileName}`;

    // Upload to organization's bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      path: data.path,
      bucket: bucketName,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      success: false,
      error: "Failed to upload file",
    };
  }
}

/**
 * Get a signed URL for file download (valid for 1 hour)
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  orgSlug: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  try {
    const bucketName = getBucketName(orgSlug);
    const safePath = sanitizeFilePath(filePath);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(safePath, expiresIn);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  } catch (err) {
    console.error("Get signed URL error:", err);
    return { url: null, error: "Failed to generate download URL" };
  }
}

/**
 * Delete a file from the organization's storage bucket
 */
export async function deleteFile(
  supabase: SupabaseClient,
  orgSlug: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bucketName = getBucketName(orgSlug);
    const safePath = sanitizeFilePath(filePath);

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([safePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Delete file error:", err);
    return { success: false, error: "Failed to delete file" };
  }
}

/**
 * Download a file from the organization's storage bucket
 */
export async function downloadFile(
  supabase: SupabaseClient,
  orgSlug: string,
  filePath: string
): Promise<{ data: Blob | null; error: string | null }> {
  try {
    const bucketName = getBucketName(orgSlug);
    const safePath = sanitizeFilePath(filePath);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(safePath);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Download file error:", err);
    return { data: null, error: "Failed to download file" };
  }
}
