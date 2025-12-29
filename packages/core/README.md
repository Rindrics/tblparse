# @rindrics/tblparse

[![npm version](https://badge.fury.io/js/@rindrics%2Ftblparse.svg)](https://badge.fury.io/js/@rindrics%2Ftblparse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


Detect and parse table blocks from Excel/CSV files.

## Installation

```bash
pnpm install @rindrics/tblparse
```

## Usage

```typescript
import {
  loadSheet,
  detectTableBlocks,
  analyzeBlockStructure,
  extractBlockData,
} from "@rindrics/tblparse";

// Load a worksheet from file data
const sheet = loadSheet(arrayBuffer);

// Detect table blocks separated by empty rows
const blocks = detectTableBlocks(sheet);

// Analyze each block's structure
for (const block of blocks) {
  const { titleRow, headerRow, dataRows } = analyzeBlockStructure(block);
  const data = extractBlockData(sheet, block);

  console.log(`Title: ${titleRow?.labelValue}`);
  console.log(`Header: ${headerRow?.labelValue}`);
  console.log(`Data rows: ${dataRows.length}`);
}
```

## API

### `loadSheet(data, type?)`

Load a worksheet from file data.

- `data` - File data (ArrayBuffer, string, or Uint8Array)
- `type` - Data type: `"array"` (default), `"string"`, or `"buffer"`
- Returns: `WorkSheet`

### `detectTableBlocks(sheet, labelColumn?)`

Detect table blocks separated by empty rows.

- `sheet` - Excel worksheet
- `labelColumn` - Label column (default: `"A"`)
- Returns: `TableBlock[]`

### `analyzeBlockStructure(block, options?)`

Analyze a block to identify title, header, and data rows.

- `block` - Table block
- `options.headerPattern` - Regex to match header row
- `options.noHeader` - Set `true` if table has no header
- Returns: `{ titleRow, headerRow, dataRows }`

### `extractBlockData(sheet, block)`

Extract cell data from a block as a 2D string array.

- `sheet` - Excel worksheet
- `block` - Table block
- Returns: `string[][]`

## License

MIT
