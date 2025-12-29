/**
 * Table block detection module
 *
 * Represents "table candidate blocks" and determines title/header/data within them.
 */
import * as XLSX from "xlsx";

/**
 * Information about a single row in a block
 */
export interface BlockRow {
	/** Row number (1-based) */
	row: number;
	/** Number of columns with data */
	columnCount: number;
	/** Value in the label column */
	labelValue: string | undefined;
}

/**
 * A table candidate block (group of cells separated by empty rows)
 */
export interface TableBlock {
	/** Start row (1-based) */
	startRow: number;
	/** End row (1-based, inclusive) */
	endRow: number;
	/** Rows in this block */
	rows: BlockRow[];
	/** Maximum column count in this block */
	maxColumnCount: number;
}

/**
 * Options for header detection
 */
export interface HeaderDetectionOptions {
	/** Regex pattern to match header row */
	headerPattern?: RegExp;
	/** Set to true if table has no header */
	noHeader?: boolean;
}

/**
 * Detect table blocks from a sheet
 *
 * Extracts "blocks" separated by empty rows.
 *
 * @param sheet - Excel worksheet
 * @param labelColumn - Label column (default: "A")
 * @returns Array of table blocks
 */
export function detectTableBlocks(
	sheet: XLSX.WorkSheet,
	labelColumn: string = "A",
): TableBlock[] {
	const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
	const maxRow = range.e.r + 1;
	const maxCol = range.e.c + 1;

	const blocks: TableBlock[] = [];
	let currentBlock: BlockRow[] = [];
	let blockStartRow = -1;

	for (let row = 1; row <= maxRow; row++) {
		const rowInfo = analyzeRow(sheet, row, maxCol, labelColumn);

		if (rowInfo.columnCount === 0) {
			// Empty row → end current block
			if (currentBlock.length > 0) {
				blocks.push(createBlock(currentBlock, blockStartRow));
				currentBlock = [];
				blockStartRow = -1;
			}
		} else {
			// Has data → add to block
			if (blockStartRow === -1) {
				blockStartRow = row;
			}
			currentBlock.push(rowInfo);
		}
	}

	// Handle last block
	if (currentBlock.length > 0) {
		blocks.push(createBlock(currentBlock, blockStartRow));
	}

	return blocks;
}

/**
 * Analyze a row to get column count and label value
 */
function analyzeRow(
	sheet: XLSX.WorkSheet,
	row: number,
	maxCol: number,
	labelColumn: string,
): BlockRow {
	let columnCount = 0;

	for (let col = 0; col < maxCol; col++) {
		const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
		const cell = sheet[cellAddress];
		if (cell && cell.v !== undefined && cell.v !== "") {
			columnCount++;
		}
	}

	const labelCell = sheet[labelColumn + row];
	const labelValue = labelCell
		? typeof labelCell.v === "string"
			? labelCell.v.trim()
			: String(labelCell.v)
		: undefined;

	return { row, columnCount, labelValue };
}

/**
 * Create a TableBlock from rows
 */
function createBlock(rows: BlockRow[], startRow: number): TableBlock {
	const maxColumnCount = Math.max(...rows.map((r) => r.columnCount));
	const endRow = rows[rows.length - 1].row;

	return {
		startRow,
		endRow,
		rows,
		maxColumnCount,
	};
}

/**
 * Detect title row in a block
 *
 * Default logic: First row with fewer columns than maxColumnCount
 *
 * @param block - Table block
 * @returns Title row info, or undefined if not found
 */
export function detectTitleRow(block: TableBlock): BlockRow | undefined {
	const firstRow = block.rows[0];

	// If first row has fewer columns than max, consider it a title
	if (firstRow.columnCount < block.maxColumnCount) {
		return firstRow;
	}

	return undefined;
}

/**
 * Detect header row in a block
 *
 * @param block - Table block
 * @param options - Header detection options
 * @returns Header row info, or undefined if not found
 */
export function detectHeaderRow(
	block: TableBlock,
	options: HeaderDetectionOptions = {},
): BlockRow | undefined {
	const { headerPattern, noHeader } = options;

	// Explicitly no header
	if (noHeader) {
		return undefined;
	}

	const titleRow = detectTitleRow(block);
	const dataRows = titleRow ? block.rows.slice(1) : block.rows;

	if (dataRows.length === 0) {
		return undefined;
	}

	// Match by regex pattern if provided
	if (headerPattern) {
		const match = dataRows.find(
			(r) => r.labelValue && headerPattern.test(r.labelValue),
		);
		if (match) {
			return match;
		}
	}

	// Default: first row after title (or first row if no title)
	return dataRows[0];
}

/**
 * Analyze block structure to separate title, header, and data rows
 *
 * @param block - Table block
 * @param options - Header detection options
 * @returns Structure with title, header, and data rows
 */
export function analyzeBlockStructure(
	block: TableBlock,
	options: HeaderDetectionOptions = {},
): {
	titleRow: BlockRow | undefined;
	headerRow: BlockRow | undefined;
	dataRows: BlockRow[];
} {
	const titleRow = detectTitleRow(block);
	const headerRow = detectHeaderRow(block, options);

	// Extract data rows (excluding title and header)
	let dataRows = block.rows;

	if (titleRow) {
		dataRows = dataRows.filter((r) => r.row !== titleRow.row);
	}
	if (headerRow) {
		dataRows = dataRows.filter((r) => r.row !== headerRow.row);
	}

	return { titleRow, headerRow, dataRows };
}

/**
 * Load a worksheet from file data
 *
 * @param data - File data (ArrayBuffer, string, etc.)
 * @param type - Data type (default: "array" for ArrayBuffer)
 * @returns First worksheet from the workbook
 * @throws Error if workbook contains no sheets
 */
export function loadSheet(
	data: ArrayBuffer | string | Uint8Array,
	type: "array" | "string" | "buffer" = "array",
): XLSX.WorkSheet {
	const workbook = XLSX.read(data, { type });

	if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
		throw new Error("Workbook contains no sheets");
	}

	return workbook.Sheets[workbook.SheetNames[0]];
}

/**
 * Extract cell data from a block as a 2D string array
 *
 * @param sheet - Excel worksheet
 * @param block - Table block to extract data from
 * @returns 2D array of cell values
 */
export function extractBlockData(
	sheet: XLSX.WorkSheet,
	block: TableBlock,
): string[][] {
	const data: string[][] = [];

	for (let row = block.startRow; row <= block.endRow; row++) {
		const rowData: string[] = [];
		for (let col = 0; col < block.maxColumnCount; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
			const cell = sheet[cellAddress];
			rowData.push(cell?.v !== undefined ? String(cell.v) : "");
		}
		data.push(rowData);
	}

	return data;
}
