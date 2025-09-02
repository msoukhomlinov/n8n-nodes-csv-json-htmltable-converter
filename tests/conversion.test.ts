import { csvToJson, csvToHtml } from '../src/nodes/CsvJsonHtmltableConverter/utils/csvConverter';
import { jsonToCsv, jsonToHtml } from '../src/nodes/CsvJsonHtmltableConverter/utils/jsonConverter';
import { htmlToCsv, htmlToJson } from '../src/nodes/CsvJsonHtmltableConverter/utils/htmlConverter';
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
});
