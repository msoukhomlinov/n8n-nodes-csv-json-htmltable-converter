import { convertData } from './convertData';

describe('CSV to CSV conversion', () => {
  const csvWithHeaders = 'name,age\nAlice,30\nBob,25';
  const csvWithoutHeaders = 'Alice,30\nBob,25';

  it('should include headers when includeTableHeaders is true', async () => {
    const result = await convertData(csvWithHeaders, 'csv', 'csv', { includeTableHeaders: true });
    expect(result).toContain('name,age');
    expect(result).toContain('Alice,30');
    expect(result).toContain('Bob,25');
  });

  it('should not include headers when includeTableHeaders is false', async () => {
    const result = await convertData(csvWithHeaders, 'csv', 'csv', { includeTableHeaders: false });
    expect(result).not.toContain('name,age');
    expect(result).toContain('Alice,30');
    expect(result).toContain('Bob,25');
  });

  it('should minify output when prettyPrint is false', async () => {
    const result = await convertData(csvWithHeaders, 'csv', 'csv', { includeTableHeaders: true, prettyPrint: false });
    // Should be one line per record, no extra blank lines
    expect(typeof result).toBe('string');
    const lines = (result as string).split('\n').filter(Boolean);
    expect(lines.length).toBe(3); // header + 2 records
    expect(lines[0]).toBe('name,age');
    expect(lines[1]).toBe('Alice,30');
    expect(lines[2]).toBe('Bob,25');
  });

  it('should handle CSV without headers and includeTableHeaders false', async () => {
    const result = await convertData(csvWithoutHeaders, 'csv', 'csv', { includeTableHeaders: false });
    expect(result).not.toContain('name,age');
    expect(result).toContain('Alice,30');
    expect(result).toContain('Bob,25');
  });
});
