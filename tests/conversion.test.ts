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

  test('formatOutputItem should return n8nObject arrays as multiple execution items', async () => {
    const csvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const convertResult = await convertData(csvInput, 'csv', 'n8nObject', { includeTableHeaders: true });

    // This simulates what happens in handleRegularConversion with wrapping enabled (default)
    const outputItems = formatOutputItem(convertResult, 'n8nObject', 'convertedData', true, 'convertedData');

    // n8nObject format: arrays should be returned as multiple execution data items, each wrapped in convertedData
    expect(Array.isArray(outputItems)).toBe(true);
    expect(outputItems).toHaveLength(2);
    expect((outputItems as any)[0].json).toEqual({ convertedData: { Product: 'SyncBackFree', Vendor: '2BrightSparks' } });
    expect((outputItems as any)[1].json).toEqual({ convertedData: { Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' } });
  });

  test('CSV to n8nObject with user data should return multiple execution items', async () => {
    const userCsvInput = '"Product","Vendor"\n"SyncBackFree","2BrightSparks"\n"3CX Call Flow Designer (EXE-x64)","3CX Ltd."';
    const convertResult = await convertData(userCsvInput, 'csv', 'n8nObject', { includeTableHeaders: true });
    const outputItems = formatOutputItem(convertResult, 'n8nObject', 'convertedData', true, 'convertedData');

    // Should return multiple execution items, each wrapped in convertedData (default behavior)
    expect(Array.isArray(outputItems)).toBe(true);
    expect(outputItems).toHaveLength(2);
    expect((outputItems as any)[0].json).toEqual({ convertedData: { Product: 'SyncBackFree', Vendor: '2BrightSparks' } });
    expect((outputItems as any)[1].json).toEqual({ convertedData: { Product: '3CX Call Flow Designer (EXE-x64)', Vendor: '3CX Ltd.' } });
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
});
