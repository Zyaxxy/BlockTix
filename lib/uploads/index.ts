// Client-safe upload utilities (validation constants and helpers only)
// Actual upload logic is in API routes which use supabaseAdmin

// File validation constants
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
export const MAX_EVENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an image file against type and size constraints (client-side)
 */
export function validateImageFile(
  file: File,
  maxSize: number
): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.",
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}