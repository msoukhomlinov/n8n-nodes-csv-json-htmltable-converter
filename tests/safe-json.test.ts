import { safeJsonParse, safeJsonStringify } from '../src/nodes/CsvJsonHtmltableConverter/utils/safeJson';

describe('Safe JSON parsing', () => {
  test('parses valid JSON correctly', () => {
    const json = '{"name": "test", "value": 123}';
    const result = safeJsonParse(json);
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  test('rejects malformed JSON', () => {
    const malformedJson = '{"name": "test", "value":}';
    expect(() => safeJsonParse(malformedJson)).toThrow('JSON parsing failed');
  });

  test('rejects empty input', () => {
    expect(() => safeJsonParse('')).toThrow('Invalid JSON input');
    expect(() => safeJsonParse('   ')).toThrow('Invalid JSON input');
  });

  test('rejects functions in JSON', () => {
    const jsonWithFunction = '{"name": "test", "func": function() { return true; }}';
    expect(() => safeJsonParse(jsonWithFunction)).toThrow('JSON contains JavaScript functions');
  });

  test('handles deeply nested structures', () => {
    const nestedJson = '{"a":{"b":{"c":{"d":{"e":"value"}}}}}';
    const result = safeJsonParse(nestedJson);
    expect(result.a.b.c.d.e).toBe('value');
  });

  test('rejects excessively nested structures', () => {
    let deeplyNested = '{"a":';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '{"nested":';
    }
    deeplyNested += '"value"';
    for (let i = 0; i < 110; i++) {
      deeplyNested += '}';
    }
    deeplyNested += '}';

    expect(() => safeJsonParse(deeplyNested)).toThrow('JSON structure too complex');
  });
});

describe('Safe JSON stringification', () => {
  test('stringifies objects correctly', () => {
    const obj = { name: 'test', value: 123 };
    const result = safeJsonStringify(obj);
    expect(result).toBe('{"name":"test","value":123}');
  });

  test('handles pretty printing', () => {
    const obj = { name: 'test', value: 123 };
    const result = safeJsonStringify(obj, { indent: 2 });
    expect(result).toContain('\n');
  });
});
