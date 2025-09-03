const { sanitizeHtml, validateHtmlInput } = require('./dist/nodes/CsvJsonHtmltableConverter/utils/htmlSanitizer.js');

// Test sanitization
const maliciousHtml = '<table><tr><td>safe</td><script>alert("xss")</script><td onclick="alert(\'xss\')">dangerous</td></tr></table>';
console.log('Original:', maliciousHtml);
const sanitized = sanitizeHtml(maliciousHtml);
console.log('Sanitized:', sanitized);

// Test validation
try {
  validateHtmlInput('<table><tr><td>test</td></tr></table>');
  console.log('Validation passed for valid HTML');
} catch (e) {
  console.log('Validation failed:', e.message);
}

try {
  validateHtmlInput('');
  console.log('Validation passed for empty HTML');
} catch (e) {
  console.log('Validation correctly failed for empty HTML:', e.message);
}
