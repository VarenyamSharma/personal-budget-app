import { z } from 'zod';

/**
 * Input sanitization utilities to prevent XSS and other security issues
 */

/**
 * Sanitizes a string by removing potentially dangerous HTML/script content
 * @param input The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Replace HTML tags and entities
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitizes an object by recursively sanitizing all string properties
 * @param obj The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

/**
 * Creates a Zod schema with sanitization applied to string fields
 * @param schema The original Zod schema
 * @returns A new schema that sanitizes string inputs
 */
export function createSanitizedSchema<T extends z.ZodType<any, any, any>>(
  schema: T
): z.ZodEffects<T, any, z.input<T>> {
  return schema.transform((data) => {
    return sanitizeObject(data);
  });
}

/**
 * Common validation schemas with sanitization
 */
export const ValidationSchemas = {
  /**
   * Schema for validating and sanitizing profile data
   */
  profile: createSanitizedSchema(
    z.object({
      name: z.string().min(1, "Name is required").max(50, "Name is too long"),
      avatar: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
    })
  ),
  
  /**
   * Schema for validating and sanitizing group data
   */
  group: createSanitizedSchema(
    z.object({
      name: z.string().min(1, "Group name is required").max(50, "Group name is too long"),
      type: z.enum(['family', 'roommates', 'personal', 'other', 'friends'], {
        errorMap: () => ({ message: "Invalid group type" })
      }),
      profiles: z.array(
        z.object({
          name: z.string().min(1, "Profile name is required").max(50, "Profile name is too long"),
          avatar: z.string().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
        })
      ).min(1, "At least one profile is required"),
    })
  ),
  
  /**
   * Schema for validating and sanitizing transaction data
   */
  transaction: createSanitizedSchema(
    z.object({
      amount: z.number().positive("Amount must be positive"),
      description: z.string().min(3, "Description is too short").max(100, "Description is too long"),
      category: z.string().min(1, "Category is required").max(50, "Category is too long"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
      profileId: z.string().min(1, "Profile ID is required"),
      groupId: z.string().min(1, "Group ID is required"),
      type: z.enum(['income', 'expense'], {
        errorMap: () => ({ message: "Type must be 'income' or 'expense'" })
      }),
    })
  ),
};

/**
 * CSRF protection token utilities
 */

// Generate a CSRF token
export function generateCsrfToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Validate a CSRF token (in a real app, this would check against stored tokens)
export function validateCsrfToken(token: string): boolean {
  // In a real implementation, this would verify the token against a stored value
  // For now, we just check that it exists and has the expected format
  return Boolean(token && token.length >= 20);
}