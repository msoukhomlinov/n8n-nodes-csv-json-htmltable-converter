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
});
