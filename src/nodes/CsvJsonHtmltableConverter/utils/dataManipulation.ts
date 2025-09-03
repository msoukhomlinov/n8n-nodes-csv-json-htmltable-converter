/**
 * Data manipulation utilities for sorting, filtering, and reordering data
 */

import type { ConversionOptions } from '../types';
import { debug } from './debug';

/**
 * Parse a comma-separated field list, handling quoted field names with spaces
 * Examples:
 * - "name, age, city" -> ["name", "age", "city"]
 * - '"full name", age, "email address"' -> ["full name", "age", "email address"]
 * - 'name,"full address",phone' -> ["name", "full address", "phone"]
 */
export function parseFieldList(fieldsStr: string): string[] {
  if (!fieldsStr || !fieldsStr.trim()) {
    return [];
  }

  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < fieldsStr.length; i++) {
    const char = fieldsStr[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      // Start of quoted field
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      // End of quoted field
      inQuotes = false;
      quoteChar = '';
    } else if (char === ',' && !inQuotes) {
      // Field separator (only when not in quotes)
      fields.push(current.trim());
      current = '';
    } else {
      // Regular character
      current += char;
    }
  }

  // Add the last field
  if (current.trim()) {
    fields.push(current.trim());
  }

  return fields.filter(field => field.length > 0);
}

/**
 * Find the actual field name in an object that matches the target field name case-insensitively
 */
function findActualFieldName(item: Record<string, any>, targetFieldName: string): string | null {
  const targetLower = targetFieldName.toLowerCase();

  for (const actualFieldName of Object.keys(item)) {
    if (actualFieldName.toLowerCase() === targetLower) {
      return actualFieldName;
    }
  }

  return null;
}

/**
 * Filter and reorder an array of objects based on specified field names
 * Field name matching is case-insensitive
 */
export function filterAndReorderFields<T extends Record<string, any>>(
  data: T[],
  fieldNames: string[]
): T[] {
  if (!fieldNames || fieldNames.length === 0) {
    return data; // No filtering, return original data
  }

  return data.map(item => {
    const newItem = {} as T;

    // Add fields in the specified order
    for (const fieldName of fieldNames) {
      const actualFieldName = findActualFieldName(item, fieldName);
      if (actualFieldName !== null) {
        newItem[actualFieldName as keyof T] = item[actualFieldName];
      }
    }

    return newItem;
  });
}

/**
 * Sort an array of objects by a specified field name and order
 * Field name matching is case-insensitive
 */
export function sortByField<T extends Record<string, any>>(
  data: T[],
  fieldName: string,
  order: 'ascending' | 'descending' = 'ascending'
): T[] {
  if (!fieldName || !fieldName.trim()) {
    return data; // No sorting, return original data
  }

  const targetFieldName = fieldName.trim();

  return [...data].sort((a, b) => {
    // Find the actual field names case-insensitively
    const aFieldName = findActualFieldName(a, targetFieldName);
    const bFieldName = findActualFieldName(b, targetFieldName);

    const aValue = aFieldName ? a[aFieldName] : undefined;
    const bValue = bFieldName ? b[bFieldName] : undefined;

    // Handle undefined/null values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === 'ascending' ? -1 : 1;
    if (bValue == null) return order === 'ascending' ? 1 : -1;

    // Convert to comparable values
    let aComp: string | number = aValue;
    let bComp: string | number = bValue;

    // Try to parse as numbers if they look like numbers
    const aNum = Number(aValue);
    const bNum = Number(bValue);

    if (!isNaN(aNum) && !isNaN(bNum) &&
        typeof aValue !== 'boolean' && typeof bValue !== 'boolean') {
      aComp = aNum;
      bComp = bNum;
    } else {
      // Convert to strings for comparison
      aComp = String(aValue).toLowerCase();
      bComp = String(bValue).toLowerCase();
    }

    // Compare values
    let result = 0;
    if (aComp < bComp) {
      result = -1;
    } else if (aComp > bComp) {
      result = 1;
    }

    // Apply sort order
    return order === 'ascending' ? result : -result;
  });
}

/**
 * Apply data manipulation options to an array of objects
 * This includes filtering/reordering fields and sorting
 */
export function manipulateData<T extends Record<string, any>>(
  data: T[],
  options: ConversionOptions
): T[] {
  if (!Array.isArray(data) || data.length === 0) {
    return data;
  }

  debug('dataManipulation.ts', `Starting data manipulation`, {
    dataLength: data.length,
    sortByField: options.sortByField,
    sortOrder: options.sortOrder,
    fields: options.fields
  });

  let result = data;

  // Step 1: Sort the data if sortByField is specified
  if (options.sortByField && options.sortByField.trim()) {
    debug('dataManipulation.ts', `Sorting by field: ${options.sortByField}, order: ${options.sortOrder}`);
    result = sortByField(result, options.sortByField, options.sortOrder);
  }

  // Step 2: Filter and reorder fields if fields option is specified
  if (options.fields && options.fields.trim()) {
    const fieldNames = parseFieldList(options.fields);
    debug('dataManipulation.ts', `Filtering and reordering fields`, { fieldNames });

    if (fieldNames.length > 0) {
      result = filterAndReorderFields(result, fieldNames);
    }
  }

  debug('dataManipulation.ts', `Data manipulation completed`, {
    originalLength: data.length,
    resultLength: result.length
  });

  return result;
}
