import { sanitizeHtml, validateHtmlInput } from '../src/nodes/CsvJsonHtmltableConverter/utils/htmlSanitizer';
import { safeJsonParse, safeJsonStringify } from '../src/nodes/CsvJsonHtmltableConverter/utils/safeJson';

describe('HTML Sanitization Security Tests', () => {
  test('removes script tags completely', () => {
    const malicious = '<table><tr><td>safe</td><script>alert("xss")</script><td>content</td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('safe');
    expect(sanitized).toContain('content');
  });

  test('removes dangerous event handlers', () => {
    const malicious = '<table><tr><td onclick="alert(\'xss\')">click me</td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('click me');
  });

  test('removes multiple dangerous attributes', () => {
    const malicious = '<table><tr><td onload="evil()" onerror="bad()" onmouseover="hack()">test</td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onmouseover');
    expect(sanitized).not.toContain('evil');
    expect(sanitized).not.toContain('bad');
    expect(sanitized).not.toContain('hack');
    expect(sanitized).toContain('test');
  });

  test('removes javascript URLs', () => {
    const malicious = '<table><tr><td><a href="javascript:alert(\'xss\')">link</a></td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('href="#"');
    expect(sanitized).toContain('link');
  });

  test('removes vbscript URLs', () => {
    const malicious = '<table><tr><td><a href="vbscript:msgbox(\'xss\')">link</a></td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('vbscript:');
    expect(sanitized).toContain('href="#"');
  });

  test('removes dangerous tags', () => {
    const malicious = '<table><iframe src="evil.com"></iframe><object data="bad.swf"></object><embed src="malicious"></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('<iframe>');
    expect(sanitized).not.toContain('<object>');
    expect(sanitized).not.toContain('<embed>');
    expect(sanitized).toContain('<table>');
  });

  test('handles complex nested attacks', () => {
    const malicious = '<table><tr><td><script><iframe src="evil.com"><\/iframe><\/script><img src="safe.jpg" onerror="alert(1)"></td></tr></table>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<iframe>');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('safe.jpg');
  });

  test('preserves legitimate HTML structure', () => {
    const legitimate = '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>John</td><td>30</td></tr></tbody></table>';
    const sanitized = sanitizeHtml(legitimate);
    expect(sanitized).toBe(legitimate); // Should be unchanged for safe HTML
  });
});

describe('Input Validation Security Tests', () => {
  test('validates HTML input size limits', () => {
    // Create HTML that definitely exceeds 10MB
    const veryLargeContent = 'x'.repeat(12 * 1024 * 1024); // 12MB of content
    const veryLargeHtml = `<table><tr><td>${veryLargeContent}</td></tr></table>`;
    expect(() => validateHtmlInput(veryLargeHtml)).toThrow('too large');

    // Should pass with larger limit
    expect(() => validateHtmlInput('<table><tr><td>test</td></tr></table>', 50 * 1024 * 1024)).not.toThrow();
  });

  test('validates HTML structure requirements', () => {
    expect(() => validateHtmlInput('<div>no table here</div>')).toThrow('no table elements found');
    expect(() => validateHtmlInput('<table><tr><td>test</td></tr></table>')).not.toThrow();
  });

  test('validates empty and malformed input', () => {
    expect(() => validateHtmlInput('')).toThrow('must be a non-empty string');
    expect(() => validateHtmlInput('   ')).toThrow('appears to be empty');
    expect(() => validateHtmlInput(null as any)).toThrow('must be a non-empty string');
  });

  test('detects excessively nested HTML', () => {
    let deeplyNested = '<table>';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '<tr><td>';
    }
    deeplyNested += 'content';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '</td></tr>';
    }
    deeplyNested += '</table>';

    expect(() => validateHtmlInput(deeplyNested)).toThrow('excessively nested structure');
  });
});

describe('JSON Parsing Security Tests', () => {
  test('prevents function injection in JSON', () => {
    const maliciousJson = '{"data": "safe", "func": function() { return malicious; }}';
    expect(() => safeJsonParse(maliciousJson)).toThrow('contains JavaScript functions');
  });

  test('prevents arrow function injection', () => {
    const maliciousJson = '{"data": "safe", "func": () => { return malicious; }}';
    expect(() => safeJsonParse(maliciousJson)).toThrow('contains JavaScript functions');
  });

  test('validates JSON size limits', () => {
    const largeJson = '{"data": "' + 'x'.repeat(60 * 1024 * 1024) + '"}'; // ~60MB string
    expect(() => safeJsonParse(largeJson)).toThrow('too large');
  });

  test('prevents prototype pollution attempts', () => {
    const maliciousJson = '{"__proto__": {"isAdmin": true}, "data": "safe"}';
    const result = safeJsonParse(maliciousJson);
    expect(result.data).toBe('safe');
    // __proto__ should not affect Object.prototype
    expect(({} as any).isAdmin).toBeUndefined();
  });

  test('validates JSON structure before parsing', () => {
    // Incomplete JSON should be caught by structure validation
    expect(() => safeJsonParse('{"incomplete":')).toThrow('malformed JSON detected');
    // Malformed JSON with balanced braces may fall through to JSON.parse
    expect(() => safeJsonParse('{invalid structure}')).toThrow('JSON parsing failed');
  });

  test('prevents deeply nested structures', () => {
    let deeplyNested = '{"a":';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '{"nested":';
    }
    deeplyNested += '"value"';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '}';
    }
    deeplyNested += '}';

    expect(() => safeJsonParse(deeplyNested)).toThrow('structure too complex');
  });
});

describe('Integration Security Tests', () => {
  test('sanitizes HTML before validation', () => {
    const malicious = '<script>evil()</script><table><tr><td>safe</td></tr></table>';
    validateHtmlInput(malicious); // Should pass validation after sanitization
    expect(sanitizeHtml(malicious)).not.toContain('<script>');
  });

  test('handles edge cases gracefully', () => {
    const edgeCases = [
      '<table><tr><td></td></tr></table>', // Empty cells
      '<table><tr><td><a href="#anchor">link</a></td></tr></table>', // Safe links
      '<table><tr><td><img src="safe.jpg" alt="image"></td></tr></table>', // Safe images
    ];

    edgeCases.forEach(html => {
      expect(() => validateHtmlInput(html)).not.toThrow();
      expect(sanitizeHtml(html)).toContain('<table>');
    });
  });

  test('maintains data integrity', () => {
    const originalData = [
      { name: 'Alice', age: 30, active: true },
      { name: 'Bob', age: 25, active: false }
    ];

    const jsonString = JSON.stringify(originalData);
    const parsed = safeJsonParse(jsonString);
    const reStringified = safeJsonStringify(parsed);

    expect(parsed).toEqual(originalData);
    expect(() => safeJsonParse(reStringified)).not.toThrow();
  });
});
