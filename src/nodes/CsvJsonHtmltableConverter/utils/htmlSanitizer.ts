/**
 * HTML Sanitization utility for preventing XSS attacks and script injection
 */

const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea',
  'meta', 'link', 'style', 'noscript', 'applet', 'frame', 'frameset'
];

const DANGEROUS_ATTRIBUTES = [
  'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick', 'onerror', 'onfocus',
  'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onmousedown', 'onmousemove',
  'onmouseout', 'onmouseover', 'onmouseup', 'onreset', 'onresize', 'onselect',
  'onsubmit', 'onunload', 'javascript:', 'data:text/html', 'vbscript:'
];

/**
 * Sanitizes HTML content to prevent XSS attacks and script injection
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return html;
  }

  let sanitized = html;

  // Remove dangerous script content
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script[^>]*\/>/gi, '');

  // Remove dangerous tags
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\s\S]*?<\/${tag}>`, 'gi');
    sanitized = sanitized.replace(tagRegex, '');
    // Also handle self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // Remove dangerous attributes
  for (const attr of DANGEROUS_ATTRIBUTES) {
    // Remove attributes that start with dangerous patterns
    const attrRegex = new RegExp(`\\s${attr}[^\\s]*=['"'][^'"]*['"']`, 'gi');
    sanitized = sanitized.replace(attrRegex, '');
    // Also remove attributes without quotes
    const attrNoQuoteRegex = new RegExp(`\\s${attr}[^\\s]*=[^\\s>]+`, 'gi');
    sanitized = sanitized.replace(attrNoQuoteRegex, '');
  }

  // Remove javascript: and vbscript: URLs from href/src attributes
  sanitized = sanitized.replace(/href=['"]javascript:[^'"]*['"]/gi, 'href="#"');
  sanitized = sanitized.replace(/href=['"]vbscript:[^'"]*['"]/gi, 'href="#"');
  sanitized = sanitized.replace(/src=['"]javascript:[^'"]*['"]/gi, 'src="#"');
  sanitized = sanitized.replace(/src=['"]vbscript:[^'"]*['"]/gi, 'src="#"');

  // Remove data: URLs that might contain HTML
  sanitized = sanitized.replace(/src=['"]data:text\/html[^'"]*['"]/gi, 'src="#"');

  return sanitized;
}

/**
 * Validates HTML input size and content for security
 * @param html The HTML string to validate
 * @param maxSize Maximum allowed size in bytes (default: 10MB)
 * @throws Error if validation fails
 */
export function validateHtmlInput(html: string, maxSize: number = 10 * 1024 * 1024): void {
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid HTML input: must be a non-empty string');
  }

  // Check size limit
  const byteLength = Buffer.byteLength(html, 'utf8');
  if (byteLength > maxSize) {
    throw new Error(`HTML input too large: ${byteLength} bytes exceeds maximum of ${maxSize} bytes`);
  }

  // Check for minimum size (empty or whitespace-only strings)
  if (html.trim().length === 0) {
    throw new Error('Invalid HTML input: input appears to be empty or whitespace-only');
  }

  // Basic HTML structure check (must contain at least one table tag)
  if (!/<table[^>]*>/i.test(html)) {
    throw new Error('Invalid HTML input: no table elements found');
  }

  // Check for extremely nested structures that could cause performance issues
  const nestingDepth = getMaxNestingDepth(html);
  if (nestingDepth > 100) {
    throw new Error('Invalid HTML input: excessively nested structure detected');
  }
}

/**
 * Calculates the maximum nesting depth of HTML tags
 * @param html The HTML string to analyze
 * @returns Maximum nesting depth
 */
function getMaxNestingDepth(html: string): number {
  let maxDepth = 0;
  let currentDepth = 0;

  // Simple regex to count opening and closing tags
  const tagRegex = /<\/?[a-zA-Z][^>]*>/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    if (!tag.startsWith('</') && !tag.endsWith('/>')) {
      // Opening tag
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (tag.startsWith('</')) {
      // Closing tag
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maxDepth;
}
