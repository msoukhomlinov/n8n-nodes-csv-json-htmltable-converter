/**
 * Truncate debug value for logging
 * Handles strings, objects, and other types for concise debug output
 */
function truncateDebugValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Truncate to 3 lines or 150 chars, whichever comes first
    const lines = value.split(/\r?\n/);
    let truncated = lines.slice(0, 4).join('\n');
    if (truncated.length > 150) {
      truncated = truncated.slice(0, 150) + '...';
    } else if (lines.length > 4) {
      truncated += '\n...';
    }
    return truncated;
  }
  if (typeof value === 'object' && value !== null) {
    try {
      const str = JSON.stringify(value, null, 2);
      return truncateDebugValue(str);
    } catch {
      return '[Unserialisable Object]';
    }
  }
  return value;
}

/**
 * Debug logger for CSV JSON HTMLTable Converter
 * Always logs to console
 * Usage: debug(module, message, ...args)
 */
export function debug(module: string, message: string, ...args: unknown[]): void {
  const truncatedArgs = args.map(truncateDebugValue);
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG][${timestamp}][${module}] ${message}`, ...truncatedArgs);
}

/**
 * Debug sample logger for CSV JSON HTMLTable Converter
 * Always logs to console
 * Usage: debugSample(module, label, sample)
 */
export function debugSample(module: string, label: string, sample: unknown): void {
  // Use truncateDebugValue for sample
  const truncatedSample = truncateDebugValue(sample);
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG SAMPLE][${timestamp}][${module}] ${label}:`, truncatedSample);
}
