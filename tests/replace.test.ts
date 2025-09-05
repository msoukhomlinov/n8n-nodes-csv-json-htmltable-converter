import { replaceTable } from '../src/nodes/CsvJsonHtmltableConverter/utils/replaceTable';

describe('Table replacement', () => {
  test('replaces first table with new content', async () => {
    const original = '<table><tr><td>old</td></tr></table>';
    const replacement = '<table><tr><td>new</td></tr></table>';
    const result = await replaceTable(original, replacement, {
      selectorMode: 'simple',
      tablePreset: 'first-table',
    });
    expect(result).toContain('new');
    expect(result).not.toContain('old');
  });

  test('replaces table under heading with new content', async () => {
    const sourceHtml = `<h1>Introduction</h1>
<p>This article lists software supported by Intellect IT 3rd party deployment and update management service.</p>
<h1>Last Revised</h1>
<table style="border-collapse: collapse; width: 100%;" border="1"><colgroup><col style="width: 99.951%;"></colgroup>
<thead>
<tr>
<td>Last Revised</td>
</tr>
</thead>
<tbody>
<tr>
<td>&nbsp;</td>
</tr>
</tbody>
</table>
<h1>Statistics</h1>
<table style="border-collapse: collapse; width: 100%;" border="1"><colgroup><col style="width: 49.9755%;"><col style="width: 49.9755%;"></colgroup>
<thead>
<tr>
<td>Unique Vendors</td>
<td>Unique Products</td>
</tr>
</thead>
<tbody>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
</tr>
</tbody>
</table>`;

    const replacementHtml = `<table><thead><tr><th>Last Revised</th></tr></thead><tbody><tr><td>2025-09-05T08:56:52.261-04:00</td></tr></tbody></table>`;

    const result = await replaceTable(sourceHtml, replacementHtml, {
      selectorMode: 'simple',
      tablePreset: 'table-under-heading',
      headingLevel: 1,
      headingText: 'Last Revised',
      tableIndex: 1,
    });

    // Check if replacement worked
    expect(result).toContain('2025-09-05T08:56:52.261-04:00');
    expect(result).toContain('<th>Last Revised</th>');
    expect(result).not.toContain('<td>Last Revised</td>'); // Original table header should be gone
  });
});
