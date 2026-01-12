# n8n-nodes-csv-json-htmltable-converter

This is an n8n community node that provides seamless bidirectional conversion between HTML tables, CSV, and JSON formats, with advanced table selection, replacement, and styling features.

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/msoukhomlinov)

## Key Features

- Convert between HTML Tables, CSV, and JSON formats
- **Style HTML tables with custom CSS, zebra striping, borders, and captions**
- **Replace HTML tables with new content (HTML, CSV, or JSON)**
- Advanced table selection presets:
  - All Tables, First Table, Last Table
  - Table With Caption (optionally filter by caption text)
  - Table Under Heading (numeric heading level, improved index logic)
  - Custom selectors (Cheerio CSS syntax)
- **Heading Detection:** Automatically enabled for "All Tables" preset. Detects h1-h5 headings by default and preserves hierarchy in output (e.g., `{"Section_1": {"Subsection_1_1": [...]}}`)
- n8nObject output for direct workflow integration
- Comprehensive input validation and error messages
- UI/UX enhancements for easier configuration
- Debug logging for development/troubleshooting

## Installation

Follow these instructions to install this node for your n8n instance:

```bash
npm install n8n-nodes-csv-json-htmltable-converter
```

## Usage

1. Add the "CSV JSON HTMLTable Converter" node to your workflow
2. Select the operation: **Convert**, **Replace**, or **Style**
3. Configure the source/target format, input data, and options as needed
4. For advanced table selection, use presets or custom selectors
5. Set the output field name
6. Run the workflow to process your data

## Operations

### Convert
Transform data between HTML, CSV, and JSON formats. Use advanced table selection presets or custom selectors for precise extraction.

#### Heading Detection for Multiple Tables
When using the **All Tables** preset, heading detection is automatically enabled:

- **Default behaviour:** Checks for `<h1>` through `<h5>` headings before each table
- **Hierarchy preserved:** Tables under h2 that follow an h1 are nested under the h1 section
- **Custom selector:** Optionally specify a CSS selector (e.g., `div.term-date span.year`) for non-standard headings

**Output Format:**
- **Flat structure:** `{"Section_1": [...], "Section_2": [...]}`
- **Nested hierarchy:** `{"Section_1": {"Subsection_1_1": [...], "Subsection_1_2": [...]}}`
- **CSV output:** Shows full path as comments (e.g., `# Section 1 > Subsection 1.1`)

If no heading is found, tables fall back to `table_1`, `table_2`, etc. When a heading has both direct tables and subsections, direct tables are stored in a `_data` property.

For other presets with **Multiple Tables/Objects** enabled, heading detection can be manually enabled via the **Enable Heading Detection** toggle.

#### Cell Content Format (Data Manipulation)
When converting from HTML, you can control how rich content inside table cells is extracted:

1. Enable **Show Data Manipulation**
2. Set **Cell Content Format**:
   - **Plain Text** (default): Strips all HTML, returning only text
   - **Markdown**: Preserves structure using markdown syntax

**Markdown conversion examples:**
- `<ul><li>Item 1</li><li>Item 2</li></ul>` → `- Item 1\n- Item 2`
- `<strong>bold</strong>` → `**bold**`
- `<a href="url">link</a>` → `[link](url)`
- `<code>code</code>` → `` `code` ``

### Replace
Replace an existing HTML table in a document with new content (HTML, CSV, or JSON). Supports all table selection presets and advanced selectors.

### Style
Apply custom styles to HTML tables, including CSS classes, inline styles, zebra striping, border styles, caption styling, and more. Ideal for preparing tables for display, reports, or emails.

#### Style Operation Parameters
- **HTML Input:** The HTML string containing the table(s) to style
- **Table Class:** CSS class to add to `<table>`
- **Table Style:** Inline CSS for `<table>`
- **Row Style:** Inline CSS for `<tr>` (optional)
- **Cell Style:** Inline CSS for `<td>/<th>` (optional)
- **Zebra Striping:** Enable/disable alternating row colours
- **Even Row Colour:** Background colour for even rows (if zebra striping enabled)
- **Odd Row Colour:** Background colour for odd rows (if zebra striping enabled)
- **Border Style:** Border style for `<table>` (e.g. solid, dashed, none)
- **Border Width:** Border width for `<table>` (e.g. 1px, 2px)
- **Caption Style:** Inline CSS for `<caption>` (optional)
- **Caption Position:** Position of the `<caption>` (top or bottom)
- **Output Field:** The name of the output field to store the styled HTML (default: `styledHtml`)

#### Example: Styling an HTML Table

Input HTML:
```html
<table>
  <caption>Monthly Sales</caption>
  <tr><th>Month</th><th>Sales</th></tr>
  <tr><td>January</td><td>100</td></tr>
  <tr><td>February</td><td>120</td></tr>
</table>
```

Style Operation Parameters:
- Table Class: `my-table`
- Table Style: `width: 100%; border-collapse: collapse;`
- Row Style: `font-size: 16px;`
- Cell Style: `padding: 8px;`
- Zebra Striping: `true`
- Even Row Colour: `#f2f2f2`
- Odd Row Colour: `#ffffff`
- Border Style: `solid`
- Border Width: `1px`
- Caption Style: `font-weight: bold; color: #333;`
- Caption Position: `top`

Output HTML:
```html
<table class="my-table" style="width: 100%; border-collapse: collapse; border-style: solid; border-width: 1px;">
  <caption style="font-weight: bold; color: #333; caption-side: top;">Monthly Sales</caption>
  <tr style="font-size: 16px;">
    <th style="padding: 8px; border-style: solid; border-width: 1px;">Month</th>
    <th style="padding: 8px; border-style: solid; border-width: 1px;">Sales</th>
  </tr>
  <tr style="font-size: 16px; background-color: #f2f2f2;">
    <td style="padding: 8px; border-style: solid; border-width: 1px;">January</td>
    <td style="padding: 8px; border-style: solid; border-width: 1px;">100</td>
  </tr>
  <tr style="font-size: 16px; background-color: #ffffff;">
    <td style="padding: 8px; border-style: solid; border-width: 1px;">February</td>
    <td style="padding: 8px; border-style: solid; border-width: 1px;">120</td>
  </tr>
</table>
```

### Table Selection Presets

- **All Tables**: Finds all table elements in the document
- **First Table Only**: Finds only the first table in the document
- **Last Table**: Finds the last table in the document
- **Table With Caption**: Finds a table with a <caption> element, optionally filtered by caption text. Caption is included in output (JSON, CSV, HTML).
- **Table Under Heading**: Finds a table after a heading of a specific numeric level (1–999) and (optionally) containing specific text. Table index logic only counts direct sibling tables after the heading.
- **Custom**: Use your own custom selector (for advanced users)

### Output and n8nObject Format

- **n8nObject output:** Directly outputs JavaScript objects for use in n8n workflows. Single-item arrays are unwrapped; multi-item arrays are wrapped in the output field.
- **Output field:** All results are wrapped in the specified output field (default: `convertedData`), except for n8nObject output, which is always in the `json` property.
- **Heading-based keys:** When heading detection is enabled, output uses heading text as object keys with nested hierarchy preserved, making data more meaningful and easier to access.
- **Chaining:** Improved detection and handling of n8nObject input/output for seamless chaining between nodes.

### Breaking Changes and Migration Notes

- **Removed deprecated presets:** 'Tables With Headers', 'Tables in Main Content', and 'Data Tables' presets have been removed. Use supported presets instead.
- **Table Under Heading:** Heading level is now a numeric input (1–999). Table index logic only counts direct sibling tables after the heading.
- **Output format changes:** Output wrapping and field naming are now consistent across all formats. n8nObject output is always in the 'json' property.
- **Migration:** Review your workflows for use of removed presets and update to supported options. If using Table Under Heading, ensure headingLevel and tableIndex parameters are set correctly. Review output field usage and update downstream nodes if needed.

### Debug Logging

- Optional debug logging is available for development and troubleshooting. Set `NODE_ENV` to `development` to enable detailed logs.

## License

[MIT](LICENSE.md)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow.svg)](https://buymeacoffee.com/msoukhomlinov)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.
