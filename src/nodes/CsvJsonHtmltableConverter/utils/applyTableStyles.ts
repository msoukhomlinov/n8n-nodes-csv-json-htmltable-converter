import * as cheerio from 'cheerio';
import type { ConversionOptions } from '../types';

function parseStyleString(style?: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!style) return styles;
  style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .forEach((decl) => {
      const colonIndex = decl.indexOf(':');
      if (colonIndex !== -1) {
        const property = decl.slice(0, colonIndex).trim();
        const value = decl.slice(colonIndex + 1).trim();
        if (property && value) {
          styles[property] = value;
        }
      }
    });
  return styles;
}

function mergeStyles($el: cheerio.Cheerio, style?: string): void {
  if (!style) return;
  const parsed = parseStyleString(style);
  if (Object.keys(parsed).length > 0) {
    $el.css(parsed);
  }
}

/**
 * Applies custom styles to all tables in the provided HTML string according to the options.
 * @param htmlInput The HTML string containing one or more tables
 * @param options Style options (tableClass, tableStyle, rowStyle, cellStyle, zebraStriping, etc.)
 * @returns The styled HTML string
 */
export function applyTableStyles(htmlInput: string, options: ConversionOptions): string {
  // Load as fragment to avoid <html> wrapping
  // TypeScript types for Cheerio do not support the third argument (isDocument),
  // so we use xmlMode: true as a workaround to avoid <html> wrapping for fragments.
  const $ = cheerio.load(htmlInput, { xmlMode: true });

  $('table').each((_, table) => {
    const $table = $(table);

    // Table class and style
    if (options.tableClass) {
      $table.addClass(options.tableClass);
    }
    mergeStyles($table, options.tableStyle);

    const tableStyles: Record<string, string> = {};

    const tableStyles: Record<string, string> = {};

    if (options.borderStyle) {
      tableStyles['border-style'] = options.borderStyle;
    }
    if (options.borderColor) {
      tableStyles['border-color'] = options.borderColor;
    }
    if (typeof options.borderWidth === 'number' && options.borderWidth >= 0) {
      $table.attr('border', options.borderWidth.toString());
      tableStyles['border-width'] = `${options.borderWidth}px`;
    }
    if (options.borderRadius) {
      tableStyles['border-radius'] = options.borderRadius;
    }
    if (options.borderCollapse) {
      tableStyles['border-collapse'] = options.borderCollapse;
    }
    if (options.tableTextAlign) {
      tableStyles['text-align'] = options.tableTextAlign;
    }

  
    if (Object.keys(tableStyles).length) {
      $table.css(tableStyles);
    }

    // Row style and row text align
    $table.find('tr').each((i, row) => {
      const $row = $(row);

      mergeStyles($row, options.rowStyle);

      const rowStyles: Record<string, string> = {};
      if (options.rowTextAlign) {
        rowStyles['text-align'] = options.rowTextAlign;
      }
      if (Object.keys(rowStyles).length) {
        $row.css(rowStyles);
      }
    });

    // Cell style and cell text align for <td> and <th>
    $table.find('td, th').each((_, cell) => {
      const $cell = $(cell);

      mergeStyles($cell, options.cellStyle);

      const cellStyles: Record<string, string> = {};
      if (options.cellTextAlign) {
        cellStyles['text-align'] = options.cellTextAlign;
      }
      if (Object.keys(cellStyles).length) {
        $cell.css(cellStyles);
      }
    });

    // Zebra striping
    if (options.zebraStriping) {
      $table.find('tbody tr').each((i, row) => {
        const $row = $(row);
        if (i % 2 === 0 && options.evenRowColor) {
          $row.css('background-color', options.evenRowColor);
        } else if (i % 2 === 1 && options.oddRowColor) {
          $row.css('background-color', options.oddRowColor);
        }
      });
    }

    // Caption style and position
    const $caption = $table.find('caption').first();
    if ($caption.length > 0) {

      mergeStyles($caption, options.captionStyle);

      const captionStyles: Record<string, string> = {};
      if (options.captionPosition === 'bottom') {
        captionStyles['caption-side'] = 'bottom';
      } else if (options.captionPosition === 'top') {
        captionStyles['caption-side'] = 'top';
      }
      if (Object.keys(captionStyles).length) {
        $caption.css(captionStyles);
      }
    }
  });

  // Return only the fragment, not wrapped in <html>
  return $.root().html() || '';
}
