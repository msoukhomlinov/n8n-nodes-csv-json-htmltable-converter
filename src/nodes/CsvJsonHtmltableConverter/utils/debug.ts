/**
 * Debug logger for CSV JSON HTMLTable Converter
 * Only logs in development mode
 */
export function debug(filename: string, message: string, data?: unknown): void {
  // Only log in development mode
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toISOString();
    const dataString = data !== undefined ? JSON.stringify(data) : '';
    console.log(`[DEBUG][${timestamp}][${filename}] ${message} ${dataString}`);
  }
}

/**
 * Debug sample text (shows just the beginning of text)
 * Creates a sample of the first few lines of text or first characters
 */
export function debugSample(filename: string, message: string, text: string, maxLines = 5): void {
  // Only log in development mode
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toISOString();

    // Create a sample with first few lines or characters
    let sample = '';
    if (text) {
      const lines = text.split('\n');
      if (lines.length > 1) {
        // Use first few lines if there are line breaks
        sample = lines.slice(0, maxLines).join('\n');
        if (lines.length > maxLines) {
          sample += '...';
        }
      } else {
        // Otherwise use first 100 characters
        sample = text.length > 100 ? `${text.substring(0, 100)}...` : text;
      }
    } else {
      sample = '[empty]';
    }

    console.log(`[DEBUG SAMPLE][${timestamp}][${filename}] ${message}:\n${sample}`);
  }
}
