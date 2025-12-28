/**
 * table-block.ts のテスト
 *
 * サンプル CSV を使用してブロック検出ロジックをテスト
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import {
  detectTableBlocks,
  detectTitleRow,
  detectHeaderRow,
  analyzeBlockStructure,
} from "./table-block";

/**
 * テスト用の CSV ファイルを読み込む
 */
function loadSampleCsv(): XLSX.WorkBook {
  const fixturePath = path.join(__dirname, "__fixtures__", "sample-tables.csv");
  const content = fs.readFileSync(fixturePath, "utf-8");
  return XLSX.read(content, { type: "string" });
}

describe("table-block", () => {
  let workbook: XLSX.WorkBook;
  let sheet: XLSX.WorkSheet;

  beforeAll(() => {
    workbook = loadSampleCsv();
    sheet = workbook.Sheets[workbook.SheetNames[0]];
  });

  describe("detectTableBlocks", () => {
    it("should detect multiple blocks separated by empty rows", () => {
      const blocks = detectTableBlocks(sheet);

      // CSV has 5 tables separated by empty rows
      expect(blocks.length).toBe(5);
    });

    it("should correctly identify block boundaries", () => {
      const blocks = detectTableBlocks(sheet);

      // First block: Sales Data
      expect(blocks[0].startRow).toBe(1);
      expect(blocks[0].endRow).toBe(6);

      // Second block: Inventory List
      expect(blocks[1].startRow).toBe(8);

      // Fifth block: No Title (header starts immediately)
      expect(blocks[4].startRow).toBe(25);
    });

    it("should calculate maxColumnCount correctly", () => {
      const blocks = detectTableBlocks(sheet);

      // 売上データ: タイトル(1列) + データ(4列) → max = 4
      expect(blocks[0].maxColumnCount).toBe(4);

      // 在庫一覧: 4列
      expect(blocks[1].maxColumnCount).toBe(4);

      // シンプルテーブル: 3列（タイトル1列 + データ3列）
      expect(blocks[2].maxColumnCount).toBe(3);
    });

    it("should include all rows in block", () => {
      const blocks = detectTableBlocks(sheet);

      // 売上データ: 1行(タイトル) + 1行(ヘッダー) + 4行(データ) = 6行
      expect(blocks[0].rows.length).toBe(6);
    });
  });

  describe("detectTitleRow", () => {
    it("should detect title when columnCount < maxColumnCount", () => {
      const blocks = detectTableBlocks(sheet);
      const titleRow = detectTitleRow(blocks[0]);

      expect(titleRow).toBeDefined();
      expect(titleRow!.labelValue).toBe("Sales Data (FY2024)");
      expect(titleRow!.columnCount).toBe(1);
    });

    it("should return undefined when first row has max columns", () => {
      const blocks = detectTableBlocks(sheet);

      // Fifth block: No title, header starts immediately
      const block = blocks[4];
      const titleRow = detectTitleRow(block);

      // All rows have same column count (3), so no title detected
      expect(titleRow).toBeUndefined();
    });

    it("should detect title when first row has fewer columns", () => {
      const blocks = detectTableBlocks(sheet);

      // Third block: Simple Table (No Header) - title is 1 col, data is 3 cols
      const block = blocks[2];
      const titleRow = detectTitleRow(block);

      expect(titleRow).toBeDefined();
      expect(titleRow!.labelValue).toBe("Simple Table (No Header)");
    });
  });

  describe("detectHeaderRow", () => {
    it("should detect header as first row after title by default", () => {
      const blocks = detectTableBlocks(sheet);
      const headerRow = detectHeaderRow(blocks[0]);

      expect(headerRow).toBeDefined();
      expect(headerRow!.labelValue).toBe("Month");
    });

    it("should detect header with regex pattern", () => {
      const blocks = detectTableBlocks(sheet);
      const headerRow = detectHeaderRow(blocks[1], {
        headerPattern: /^Item$/,
      });

      expect(headerRow).toBeDefined();
      expect(headerRow!.labelValue).toBe("Item");
    });

    it("should return undefined when noHeader is true", () => {
      const blocks = detectTableBlocks(sheet);
      const headerRow = detectHeaderRow(blocks[2], { noHeader: true });

      expect(headerRow).toBeUndefined();
    });
  });

  describe("analyzeBlockStructure", () => {
    it("should correctly separate title, header, and data rows", () => {
      const blocks = detectTableBlocks(sheet);
      const structure = analyzeBlockStructure(blocks[0]);

      expect(structure.titleRow).toBeDefined();
      expect(structure.titleRow!.labelValue).toBe("Sales Data (FY2024)");

      expect(structure.headerRow).toBeDefined();
      expect(structure.headerRow!.labelValue).toBe("Month");

      // Data rows: Jan, Feb, Mar, Total = 4 rows
      expect(structure.dataRows.length).toBe(4);
      expect(structure.dataRows[0].labelValue).toBe("Jan");
      expect(structure.dataRows[3].labelValue).toBe("Total");
    });

    it("should handle table without header", () => {
      const blocks = detectTableBlocks(sheet);
      const structure = analyzeBlockStructure(blocks[2], { noHeader: true });

      expect(structure.titleRow).toBeDefined();
      expect(structure.titleRow!.labelValue).toBe("Simple Table (No Header)");

      expect(structure.headerRow).toBeUndefined();

      // Data rows: 3 rows
      expect(structure.dataRows.length).toBe(3);
    });

    it("should handle table with custom header pattern", () => {
      const blocks = detectTableBlocks(sheet);
      const structure = analyzeBlockStructure(blocks[3], {
        headerPattern: /^ID$/,
      });

      expect(structure.titleRow!.labelValue).toBe("Notes Data");
      expect(structure.headerRow!.labelValue).toBe("ID");
      expect(structure.dataRows.length).toBe(3);
    });

    it("should handle table without title (header starts immediately)", () => {
      const blocks = detectTableBlocks(sheet);
      const structure = analyzeBlockStructure(blocks[4]);

      // No title because all rows have same column count
      expect(structure.titleRow).toBeUndefined();

      // Header is the first row
      expect(structure.headerRow).toBeDefined();
      expect(structure.headerRow!.labelValue).toBe("Name");

      // Data rows: Alice, Bob, Charlie = 3 rows
      expect(structure.dataRows.length).toBe(3);
      expect(structure.dataRows[0].labelValue).toBe("Alice");
    });
  });

  describe("edge cases", () => {
    it("should handle single-row block", () => {
      // Create a mock sheet with single row
      const singleRowSheet: XLSX.WorkSheet = {
        A1: { v: "Single Row" },
        "!ref": "A1:A1",
      };

      const blocks = detectTableBlocks(singleRowSheet);

      expect(blocks.length).toBe(1);
      expect(blocks[0].rows.length).toBe(1);
    });

    it("should handle empty sheet", () => {
      const emptySheet: XLSX.WorkSheet = {
        "!ref": "A1:A1",
      };

      const blocks = detectTableBlocks(emptySheet);

      expect(blocks.length).toBe(0);
    });
  });
});
