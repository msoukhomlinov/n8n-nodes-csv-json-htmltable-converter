/**
 * Safe JSON parsing utilities with size limits and error handling
 */

const MAX_JSON_SIZE = 50 * 1024 * 1024; // 50MB max for JSON
const MAX_NESTING_DEPTH = 100;

/**
 * Safely parses JSON with size and structure validation
 * @param jsonString The JSON string to parse
 * @param options Parsing options
 * @returns Parsed JSON object
 * @throws Error if parsing fails or validation fails
 */
export function safeJsonParse(
  jsonString: string,
  options: {
    maxSize?: number;
    maxDepth?: number;
    allowFunctions?: boolean;
  } = {}
): any {
  const {
    maxSize = MAX_JSON_SIZE,
    maxDepth = MAX_NESTING_DEPTH,
    allowFunctions = false
  } = options;

  // Validate input
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Invalid JSON input: must be a non-empty string');
  }

  // Check size limit
  const byteLength = Buffer.byteLength(jsonString, 'utf8');
  if (byteLength > maxSize) {
    throw new Error(`JSON input too large: ${byteLength} bytes exceeds maximum of ${maxSize} bytes`);
  }

  // Check for minimum size
  if (jsonString.trim().length === 0) {
    throw new Error('Invalid JSON input: input appears to be empty or whitespace-only');
  }

  // Basic structure validation before parsing
  const trimmed = jsonString.trim();
  if (!isValidJsonStructure(trimmed)) {
    throw new Error('Invalid JSON structure: malformed JSON detected');
  }

  // Check nesting depth
  const nestingDepth = getJsonNestingDepth(trimmed);
  if (nestingDepth > maxDepth) {
    throw new Error(`JSON structure too complex: nesting depth ${nestingDepth} exceeds maximum of ${maxDepth}`);
  }

  // Check for potentially dangerous content
  if (!allowFunctions && containsJavaScriptFunctions(trimmed)) {
    throw new Error('JSON contains JavaScript functions which are not allowed');
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

/**
 * Safely stringifies an object to JSON with size limits
 * @param obj The object to stringify
 * @param options Stringify options
 * @returns JSON string
 * @throws Error if stringification fails or exceeds limits
 */
export function safeJsonStringify(
  obj: any,
  options: {
    maxSize?: number;
    indent?: number | string;
  } = {}
): string {
  const { maxSize = MAX_JSON_SIZE, indent } = options;

  try {
    // First, try to stringify to check size
    const jsonString = JSON.stringify(obj, null, indent);

    // Check size limit
    const byteLength = Buffer.byteLength(jsonString, 'utf8');
    if (byteLength > maxSize) {
      throw new Error(`JSON output too large: ${byteLength} bytes exceeds maximum of ${maxSize} bytes`);
    }

    return jsonString;
  } catch (error) {
    throw new Error(`JSON stringification failed: ${error.message}`);
  }
}

/**
 * Validates basic JSON structure without full parsing
 * @param jsonString The JSON string to validate
 * @returns True if structure appears valid
 */
function isValidJsonStructure(jsonString: string): boolean {
  try {
    // Check for balanced braces/brackets
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      switch (char) {
        case '{':
          braceCount++;
          break;
        case '}':
          braceCount--;
          if (braceCount < 0) return false;
          break;
        case '[':
          bracketCount++;
          break;
        case ']':
          bracketCount--;
          if (bracketCount < 0) return false;
          break;
      }
    }

    return braceCount === 0 && bracketCount === 0;
  } catch {
    return false;
  }
}

/**
 * Calculates the maximum nesting depth of JSON structure
 * @param jsonString The JSON string to analyze
 * @returns Maximum nesting depth
 */
function getJsonNestingDepth(jsonString: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{' || char === '[') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}' || char === ']') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maxDepth;
}

/**
 * Checks if JSON string contains JavaScript function definitions
 * @param jsonString The JSON string to check
 * @returns True if functions are detected
 */
function containsJavaScriptFunctions(jsonString: string): boolean {
  // Check for function keyword
  if (/\bfunction\s*\(/.test(jsonString)) {
    return true;
  }

  // Check for arrow functions
  if (/\([^)]*\)\s*=>/.test(jsonString)) {
    return true;
  }

  // Check for function expressions
  if (/"\s*function\s*\(/.test(jsonString)) {
    return true;
  }

  return false;
}
