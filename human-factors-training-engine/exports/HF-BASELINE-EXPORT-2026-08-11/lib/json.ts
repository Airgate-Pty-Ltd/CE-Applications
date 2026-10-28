/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * JSON Serialization Utility for SQLite Json→String Boundary
 *
 * SQLite doesn't support native JSON type. This utility provides type-safe
 * serialization/deserialization at the database boundary.
 */

/**
 * Serialize an object to JSON string for database storage.
 * @param obj - Object to serialize (or already-string pass-through)
 * @returns JSON string
 */
export function toDb(obj: unknown): string {
  if (typeof obj === 'string') {
    return obj; // Already serialized
  }
  if (obj === null || obj === undefined) {
    return '{}'; // Safe default for null/undefined
  }
  return JSON.stringify(obj);
}

/**
 * Deserialize a JSON string from database to typed object.
 * @param jsonString - JSON string from database
 * @returns Parsed object of type T
 */
export function fromDb<T>(jsonString: string | null | undefined): T {
  if (!jsonString) {
    return {} as T;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    // If parsing fails, return empty object
    return {} as T;
  }
}

/**
 * Safe array serialization (SQLite doesn't support native arrays).
 * @param arr - Array to serialize
 * @returns JSON string
 */
export function toDbArray<T>(arr: T[]): string {
  return JSON.stringify(arr || []);
}

/**
 * Safe array deserialization.
 * @param jsonString - JSON string from database
 * @returns Parsed array of type T[]
 */
export function fromDbArray<T>(jsonString: string | null | undefined): T[] {
  if (!jsonString) {
    return [];
  }
  try {
    return JSON.parse(jsonString) as T[];
  } catch {
    return [];
  }
}
