/**
 * Optimized DOM traversal utilities for efficient HTML table processing
 */

import * as cheerio from 'cheerio';
import type { TableData } from '../types';

/**
 * Optimized table extraction with caching and efficient selectors
 */
export class TableExtractor {
  private $: cheerio.Root;
  private cache = new Map<string, cheerio.Cheerio>();

  constructor(html: string) {
    this.$ = cheerio.load(html, { xmlMode: true });
  }

  /**
   * Get cached element or query and cache it
   */
  private getCachedElement(selector: string): cheerio.Cheerio {
    if (!this.cache.has(selector)) {
      this.cache.set(selector, this.$(selector));
    }
    return this.cache.get(selector)!;
  }

  /**
   * Extract table data with optimized DOM traversal
   */
  extractTableData(table: cheerio.Element, includeHeaders: boolean): TableData {
    const $table = this.$(table);
    const tableData: TableData = {
      headers: [],
      rows: [],
    };

    // Extract caption (single query)
    const caption = $table.find('caption').first();
    if (caption.length > 0) {
      tableData.caption = caption.text().trim();
    }

    // Optimized header detection and extraction
    const headerInfo = this.detectAndExtractHeaders($table);
    tableData.headers = headerInfo.headers;

    // Extract data rows with optimized selectors
    const dataRows = this.extractDataRows($table, headerInfo);
    tableData.rows = dataRows;

    return tableData;
  }

  /**
   * Detect header structure and extract headers in one pass
   */
  private detectAndExtractHeaders($table: cheerio.Cheerio): { headers: string[]; hasHeader: boolean; headerRowIndex: number } {
    const headers: string[] = [];
    let hasHeader = false;
    let headerRowIndex = 0;

    // Check for thead first (most common case)
    const thead = $table.find('thead').first();
    if (thead.length > 0) {
      const headerRow = thead.find('tr').first();
      if (headerRow.length > 0) {
        this.extractCellsFromRow(headerRow, headers);
        hasHeader = headers.length > 0;
        headerRowIndex = 0;
      }
    }

    // If no thead headers found, check first row for th elements
    if (!hasHeader) {
      const firstRow = $table.find('tr').first();
      if (firstRow.length > 0) {
        const thCells = firstRow.find('th');
        if (thCells.length > 0) {
          thCells.each((_, cell) => {
            headers.push(this.$(cell).text().trim());
          });
          hasHeader = true;
          headerRowIndex = 0;
        }
      }
    }

    return { headers, hasHeader, headerRowIndex };
  }

  /**
   * Extract data rows efficiently
   */
  private extractDataRows($table: cheerio.Cheerio, headerInfo: { hasHeader: boolean; headerRowIndex: number }): string[][] {
    const rows: string[][] = [];
    const allRows = $table.find('tr');

    allRows.each((index, row) => {
      // Skip header row if headers were detected
      if (headerInfo.hasHeader && index === headerInfo.headerRowIndex) {
        return; // Continue to next iteration
      }

      const rowData: string[] = [];
      this.extractCellsFromRow(this.$(row), rowData);
      rows.push(rowData);
    });

    return rows;
  }

  /**
   * Extract cells from a row efficiently
   */
  private extractCellsFromRow($row: cheerio.Cheerio, targetArray: string[]): void {
    // Get all cells (th and td) in one query
    const cells = $row.find('th, td');
    cells.each((_, cell) => {
      targetArray.push(this.$(cell).text().trim());
    });
  }

  /**
   * Find tables using optimized selectors
   */
  findTables(selector: string): cheerio.Cheerio {
    return this.getCachedElement(selector);
  }

  /**
   * Batch process multiple tables efficiently
   */
  processTablesBatch(tableElements: cheerio.Element[], includeHeaders: boolean): TableData[] {
    return tableElements.map(table => this.extractTableData(table, includeHeaders));
  }

  /**
   * Clear cache for memory management
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Optimized table finder for complex HTML structures
 */
export class OptimizedTableFinder {
  private $: cheerio.Root;

  constructor(html: string) {
    this.$ = cheerio.load(html, { xmlMode: true });
  }

  /**
   * Find table under heading with optimized traversal
   */
  findTableUnderHeading(headingLevel: number, headingText: string, tableIndex: number): cheerio.Element | null {
    const headingSelector = `h${headingLevel}`;

    // Find all matching headings
    const headings = this.$(headingSelector).filter((_, heading) => {
      const text = this.$(heading).text().trim();
      return headingText === '' || text.toLowerCase().includes(headingText.toLowerCase());
    });

    // Process headings and find tables
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const tablesAfterHeading = this.findTablesAfterElement(heading);

      if (tablesAfterHeading.length > tableIndex) {
        return tablesAfterHeading[tableIndex];
      }
    }

    return null;
  }

  /**
   * Find table with caption efficiently
   */
  findTableWithCaption(captionText: string): cheerio.Element | null {
    const tables = this.$('table');

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const caption = this.$(table).find('caption').first();

      if (caption.length > 0) {
        const captionContent = caption.text().trim();
        if (captionText === '' || captionContent.toLowerCase().includes(captionText.toLowerCase())) {
          return table;
        }
      }
    }

    return null;
  }

  /**
   * Find tables after a given element using optimized traversal
   */
  private findTablesAfterElement(startElem: cheerio.Element): cheerio.Element[] {
    const tables: cheerio.Element[] = [];
    let foundStart = false;

    // Use a more efficient traversal by getting all descendants at once
    const allElements = this.$(startElem).parent().find('*');

    allElements.each((_, element) => {
      if (element === startElem) {
        foundStart = true;
        return;
      }

      if (foundStart && this.$(element).is('table')) {
        tables.push(element);
      }
    });

    return tables;
  }

  /**
   * Get all tables with caching
   */
  getAllTables(): cheerio.Cheerio {
    return this.$('table');
  }

  /**
   * Get table by index efficiently
   */
  getTableByIndex(index: number): cheerio.Element | null {
    const tables = this.getAllTables();
    return tables[index] || null;
  }
}

/**
 * Memory-efficient HTML processor for large documents
 */
export class MemoryEfficientProcessor {
  private static readonly MAX_CHUNK_SIZE = 100; // Process in chunks of 100 tables

  /**
   * Process large HTML documents in chunks to prevent memory spikes
   */
  static async processLargeHtml(html: string, processor: (tables: cheerio.Element[]) => Promise<any[]>): Promise<any[]> {
    const $ = cheerio.load(html, { xmlMode: true });
    const allTables = $('table').toArray();
    const results: any[] = [];

    // Process in chunks to manage memory
    for (let i = 0; i < allTables.length; i += this.MAX_CHUNK_SIZE) {
      const chunk = allTables.slice(i, i + this.MAX_CHUNK_SIZE);
      const chunkResults = await processor(chunk);

      // Allow garbage collection between chunks
      if (global.gc) {
        global.gc();
      }

      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Stream process HTML content (for very large files)
   */
  static async processStreaming(html: string, chunkSize: number = 1024 * 1024): Promise<any[]> {
    const results: any[] = [];

    // Split HTML into manageable chunks
    for (let i = 0; i < html.length; i += chunkSize) {
      const chunk = html.slice(i, i + chunkSize);
      const $ = cheerio.load(chunk, { xmlMode: true });
      const tables = $('table');

      // Process tables in this chunk
      tables.each((_, table) => {
        // Process individual table
        const extractor = new TableExtractor($.html());
        const tableData = extractor.extractTableData(table, true);
        results.push(tableData);
      });
    }

    return results;
  }
}

/**
 * Performance monitoring utilities
 */
export class DOMPerformanceMonitor {
  private static timings = new Map<string, number[]>();

  /**
   * Time a DOM operation
   */
  static timeOperation<T>(operationName: string, operation: () => T): T {
    const start = performance.now();
    const result = operation();
    const end = performance.now();

    const duration = end - start;
    this.recordTiming(operationName, duration);

    console.log(`[DOM_PERF] ${operationName}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Record timing for analysis
   */
  private static recordTiming(operation: string, duration: number): void {
    if (!this.timings.has(operation)) {
      this.timings.set(operation, []);
    }
    this.timings.get(operation)!.push(duration);
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [operation, durations] of this.timings) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      stats[operation] = {
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: durations.length,
      };
    }

    return stats;
  }

  /**
   * Clear performance data
   */
  static clearStats(): void {
    this.timings.clear();
  }
}
