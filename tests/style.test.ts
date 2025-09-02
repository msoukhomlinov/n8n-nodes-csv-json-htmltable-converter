import { applyTableStyles } from '../src/nodes/CsvJsonHtmltableConverter/utils/applyTableStyles';

describe('Table styling', () => {
  test('applies class and zebra striping', () => {
    const html = '<table><tbody><tr><td>A</td></tr><tr><td>B</td></tr></tbody></table>';
    const styled = applyTableStyles(html, {
      tableClass: 'styled',
      zebraStriping: true,
      evenRowColor: '#eee',
      oddRowColor: '#ddd',
    });
    expect(styled).toContain('class="styled"');
    expect(styled).toContain('background-color: #eee');
    expect(styled).toContain('background-color: #ddd');
  });
});
