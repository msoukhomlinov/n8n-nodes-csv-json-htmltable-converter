import { csvToJson, csvToHtml } from '../src/nodes/CsvJsonHtmltableConverter/utils/csvConverter';
import { jsonToCsv, jsonToHtml } from '../src/nodes/CsvJsonHtmltableConverter/utils/jsonConverter';
import { htmlToCsv, htmlToJson } from '../src/nodes/CsvJsonHtmltableConverter/utils/htmlConverter';
import { convertData } from '../src/nodes/CsvJsonHtmltableConverter/utils/convertData';
import { formatOutputItem } from '../src/nodes/CsvJsonHtmltableConverter/utils/operationHandlers';
import * as cheerio from 'cheerio';

const csv = 'name,age\nAlice,30\nBob,25';
const jsonArray = [
  { name: 'Alice', age: '30' },
  { name: 'Bob', age: '25' },
];
const html = '<table><thead><tr><th>name</th><th>age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr><tr><td>Bob</td><td>25</td></tr></tbody></table>';

describe('CSV, JSON and HTML conversions', () => {
  test('csv to json', async () => {
    const result = await csvToJson(csv, {});
    expect(JSON.parse(result)).toEqual(jsonArray);
  });

  test('json to csv', async () => {
    const result = await jsonToCsv(JSON.stringify(jsonArray), {});
    expect(result).toBe(csv);
  });

  test('csv to html', async () => {
    const result = await csvToHtml(csv, {});
    const $ = cheerio.load(result);
    expect($('th').map((_, el) => $(el).text()).get()).toEqual(['name', 'age']);
    expect($('tbody tr')).toHaveLength(2);
  });

  test('json to html', async () => {
    const result = await jsonToHtml(jsonArray, {});
    const $ = cheerio.load(result);
    expect($('th').map((_, el) => $(el).text()).get()).toEqual(['name', 'age']);
    expect($('tbody tr')).toHaveLength(2);
  });

  test('html to csv', async () => {
    const result = await htmlToCsv(html, {});
    expect(result.replace(/\r\n/g, '\n').trim()).toBe(csv);
  });

  test('html to json', async () => {
    const result = await htmlToJson(html, {});
    expect(JSON.parse(result)).toEqual(jsonArray);
  });

  test('csv to n8nObject conversion should return all items', async () => {
    const csvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const result = await convertData(csvInput, 'csv', 'n8nObject', { includeTableHeaders: true });

    // The result should be an array with all the objects
    expect(Array.isArray(result)).toBe(true);
    const arrayResult = result as unknown[];
    expect(arrayResult).toHaveLength(2);
    expect(arrayResult[0]).toEqual({ Product: 'SyncBackFree', Vendor: '2BrightSparks' });
    expect(arrayResult[1]).toEqual({ Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' });
  });

  test('formatOutputItem should return single wrapped item for n8nObject arrays when wrapping enabled', async () => {
    const csvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const convertResult = await convertData(csvInput, 'csv', 'n8nObject', { includeTableHeaders: true });

    // With wrapping enabled (default), expect a single execution item with entire array nested
    const outputItem = formatOutputItem(convertResult, 'n8nObject', 'convertedData', true, 'convertedData') as any;
    expect(Array.isArray(outputItem)).toBe(false);
    expect(outputItem.json).toHaveProperty('convertedData');
    expect(Array.isArray(outputItem.json.convertedData)).toBe(true);
    expect(outputItem.json.convertedData).toHaveLength(2);
    expect(outputItem.json.convertedData[0]).toEqual({ Product: 'SyncBackFree', Vendor: '2BrightSparks' });
    expect(outputItem.json.convertedData[1]).toEqual({ Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' });
  });

  test('CSV to n8nObject with user data returns single wrapped item when wrapping enabled', async () => {
    const userCsvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const convertResult = await convertData(userCsvInput, 'csv', 'n8nObject', { includeTableHeaders: true });
    const outputItem = formatOutputItem(convertResult, 'n8nObject', 'convertedData', true, 'convertedData') as any;

    // Should return a single item with array nested under convertedData
    expect(Array.isArray(outputItem)).toBe(false);
    expect(outputItem.json).toHaveProperty('convertedData');
    expect(Array.isArray(outputItem.json.convertedData)).toBe(true);
    expect(outputItem.json.convertedData).toHaveLength(2);
    expect(outputItem.json.convertedData[0]).toEqual({ Product: 'SyncBackFree', Vendor: '2BrightSparks' });
    expect(outputItem.json.convertedData[1]).toEqual({ Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' });
  });

  test('formatOutputItem with wrapOutput=false should return n8nObject arrays without wrapping', async () => {
    const userCsvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const convertResult = await convertData(userCsvInput, 'csv', 'n8nObject', { includeTableHeaders: true });
    const outputItems = formatOutputItem(convertResult, 'n8nObject', 'convertedData', false, 'convertedData');

    // With wrapping disabled, should return data directly without wrapping
    expect(Array.isArray(outputItems)).toBe(true);
    expect(outputItems).toHaveLength(2);
    expect((outputItems as any)[0].json).toEqual({ Product: 'SyncBackFree', Vendor: '2BrightSparks' });
    expect((outputItems as any)[1].json).toEqual({ Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' });
  });

  test('formatOutputItem should wrap CSV output in convertedData', async () => {
    const htmlInput = '<table><tr><td>test</td></tr></table>';
    const convertResult = await convertData(htmlInput, 'html', 'csv', { includeTableHeaders: false });
    const outputItem = formatOutputItem(convertResult, 'csv', 'convertedData') as any;

    // CSV format should be wrapped under convertedData
    expect(outputItem.json).toHaveProperty('convertedData');
    expect(outputItem.json.convertedData).toBe('test');
  });

  test('formatOutputItem should wrap JSON string output in convertedData', async () => {
    const htmlInput = '<table><tr><td>test</td></tr></table>';
    const convertResult = await convertData(htmlInput, 'html', 'json', { includeTableHeaders: false });
    const outputItem = formatOutputItem(convertResult, 'json', 'convertedData') as any;

    // JSON format should be wrapped under convertedData
    expect(outputItem.json).toHaveProperty('convertedData');
    expect(typeof outputItem.json.convertedData).toBe('string');
    expect(outputItem.json.convertedData).toContain('test');
  });

  test('formatOutputItem should wrap HTML output in convertedData', async () => {
    const csvInput = '"name","age"\n"Alice","30"';
    const convertResult = await convertData(csvInput, 'csv', 'html', { includeTableHeaders: true });
    const outputItem = formatOutputItem(convertResult, 'html', 'convertedData') as any;

    // HTML format should be wrapped under convertedData
    expect(outputItem.json).toHaveProperty('convertedData');
    expect(typeof outputItem.json.convertedData).toBe('string');
    expect(outputItem.json.convertedData).toContain('<table>');
    expect(outputItem.json.convertedData).toContain('Alice');
  });

  test('jsonToHtml with user input object should produce valid HTML', async () => {
    // Reproduce the user's issue with the exact input data
    const userInput = {"Unique Vendors Count": 944, "Products Count": 2644};
    const result = await jsonToHtml(userInput, { includeTableHeaders: true });

    // The result should be a proper HTML table, not mangled characters
    expect(typeof result).toBe('string');
    expect(result).toContain('<table>');
    expect(result).toContain('<thead>');
    expect(result).toContain('<tbody>');
    expect(result).toContain('Unique Vendors Count');
    expect(result).toContain('Products Count');
    expect(result).toContain('944');
    expect(result).toContain('2644');

    // Should NOT contain the mangled pattern like &lt;<td>t<td>a<td>b<td>l<td>e<td>
    expect(result).not.toContain('&lt;<td>');
    expect(result).not.toContain('<td>&lt;');

    console.log('Generated HTML:', result);
  });

  test('array of objects to HTML should work correctly', async () => {
    // Test with array of objects (which is what collectN8nObjectItems would produce)
    const allItems = [{"Unique Vendors Count": 944, "Products Count": 2644}];
    const options = { includeTableHeaders: true, prettyPrint: false, multipleItems: false, csvDelimiter: ',' };

    // Directly call jsonToHtml with array format
    const result = await jsonToHtml(allItems, options);

    console.log('Array to HTML result:', result);

    // Check that result is a proper HTML string, not mangled
    expect(typeof result).toBe('string');
    expect(result).toContain('<table>');
    expect(result).toContain('Unique Vendors Count');
    expect(result).toContain('Products Count');
    expect(result).toContain('944');
    expect(result).toContain('2644');

    // Should NOT contain the mangled pattern
    expect(result).not.toContain('&lt;<td>');
    expect(result).not.toContain('<td>&lt;');
  });

  describe('Heading Detection', () => {
    const htmlWithHeadings = `
      <div class="term-date"><span class="year">2025</span></div>
      <table class="table table-condensed table-hover">
        <thead></thead>
        <tbody>
          <tr><td>Term 1</td><td>Tuesday 28 January – Friday 4 April</td></tr>
          <tr><td>Term 2</td><td>Tuesday 22 April – Friday 4 July</td></tr>
        </tbody>
      </table>
      <div class="term-date"><span class="year">2026</span></div>
      <table class="table table-condensed table-hover">
        <thead></thead>
        <tbody>
          <tr><td>Term 1</td><td>Tuesday 27 January – Thursday 2 April</td></tr>
          <tr><td>Term 2</td><td>Monday 20 April – Friday 26 June</td></tr>
        </tbody>
      </table>
    `;

    test('should detect headings before tables', async () => {
      const result = await htmlToJson(htmlWithHeadings, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      expect(typeof parsed).toBe('object');
      expect(Array.isArray(parsed)).toBe(false);
      expect(parsed).toHaveProperty('2025');
      expect(parsed).toHaveProperty('2026');
    });

    test('should use headings as object keys in output', async () => {
      const result = await htmlToJson(htmlWithHeadings, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed['2025']).toBeDefined();
      expect(parsed['2026']).toBeDefined();
      expect(Array.isArray(parsed['2025'])).toBe(true);
      expect(Array.isArray(parsed['2026'])).toBe(true);
      expect(parsed['2025'][0]).toEqual(['Term 1', 'Tuesday 28 January – Friday 4 April']);
      expect(parsed['2026'][0]).toEqual(['Term 1', 'Tuesday 27 January – Thursday 2 April']);
    });

    test('should handle missing headings with fallback names', async () => {
      const htmlWithoutHeadings = `
        <table><tbody><tr><td>Data 1</td></tr></tbody></table>
        <table><tbody><tr><td>Data 2</td></tr></tbody></table>
      `;

      const result = await htmlToJson(htmlWithoutHeadings, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('table_1');
      expect(parsed).toHaveProperty('table_2');
    });

    test('should handle duplicate headings', async () => {
      const htmlWithDuplicateHeadings = `
        <div class="term-date"><span class="year">2025</span></div>
        <table><tbody><tr><td>Data 1</td></tr></tbody></table>
        <div class="term-date"><span class="year">2025</span></div>
        <table><tbody><tr><td>Data 2</td></tr></tbody></table>
      `;

      const result = await htmlToJson(htmlWithDuplicateHeadings, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('2025');
      expect(parsed).toHaveProperty('2025_2');
    });

    test('should sanitize invalid heading text', async () => {
      const htmlWithSpecialChars = `
        <div class="heading">Year 2025 (Q1-Q4)</div>
        <table><tbody><tr><td>Data 1</td></tr></tbody></table>
        <div class="heading">Year 2026: All Terms</div>
        <table><tbody><tr><td>Data 2</td></tr></tbody></table>
      `;

      const result = await htmlToJson(htmlWithSpecialChars, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.heading',
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      // Should sanitize special characters
      expect(parsed).toHaveProperty('Year_2025_Q1_Q4');
      expect(parsed).toHaveProperty('Year_2026_All_Terms');
    });

    test('should include headings in CSV output as comments', async () => {
      const result = await htmlToCsv(htmlWithHeadings, {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      expect(result).toContain('# 2025');
      expect(result).toContain('# 2026');
    });

    test('should work with n8nObject output format', async () => {
      const result = await convertData(htmlWithHeadings, 'html', 'n8nObject', {
        multipleItems: true,
        enableHeadingDetection: true,
        headingSelector: 'div.term-date span.year',
        includeTableHeaders: false,
      });

      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('2025');
      expect(result).toHaveProperty('2026');
    });

    test('should fall back to array format when heading detection is disabled', async () => {
      const result = await htmlToJson(htmlWithHeadings, {
        multipleItems: true,
        enableHeadingDetection: false,
        includeTableHeaders: false,
      });

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('data');
      expect(parsed[1]).toHaveProperty('data');
    });
  });
});
