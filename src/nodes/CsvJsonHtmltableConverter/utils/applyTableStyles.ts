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

    // Border style for table (CSS)
    if (options.borderStyle) {
      $table.css('border-style', options.borderStyle);
    }

    // Border colour for table (CSS)
    if (options.borderColor) {
      $table.css('border-color', options.borderColor);
    }

    // Border width for table (HTML attribute and CSS)
    if (typeof options.borderWidth === 'number' && options.borderWidth >= 0) {
      $table.attr('border', options.borderWidth.toString());
      $table.css('border-width', `${options.borderWidth}px`);
    }

    // Border radius for table (CSS)
    if (options.borderRadius) {
      $table.css('border-radius', options.borderRadius);
    }

    // Border collapse for table (CSS)
    if (options.borderCollapse) {
      $table.css('border-collapse', options.borderCollapse);
    }

    // Table text align (CSS)
    if (options.tableTextAlign) {
      $table.css('text-align', options.tableTextAlign);
    }

    // Row style and row text align
    $table.find('tr').each((i, row) => {
      const $row = $(row);
      mergeStyles($row, options.rowStyle);
      if (options.rowTextAlign) {
        $row.css('text-align', options.rowTextAlign);
      }
    });

    // Cell style and cell text align for <td> and <th>
    $table.find('td, th').each((_, cell) => {
      const $cell = $(cell);
      mergeStyles($cell, options.cellStyle);
      if (options.cellTextAlign) {
        $cell.css('text-align', options.cellTextAlign);
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
      if (options.captionPosition === 'bottom') {
        $caption.css('caption-side', 'bottom');
      } else if (options.captionPosition === 'top') {
        $caption.css('caption-side', 'top');
      }
    }
  });

  // Return only the fragment, not wrapped in <html>
  return $.root().html() || '';
}
