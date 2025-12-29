import type { TableBlock } from "@rindrics/tblparse";
import { useState } from "react";
import type { WorkSheet } from "xlsx";

interface BlockWithData {
	block: TableBlock;
	title: string | undefined;
	data: string[][];
}

interface SheetData {
	name: string;
	blocks: BlockWithData[];
}

function App() {
	const [sheets, setSheets] = useState<SheetData[]>([]);
	const [activeSheet, setActiveSheet] = useState<number>(0);
	const [fileName, setFileName] = useState<string>("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setFileName(file.name);

		const XLSX = await import("xlsx");
		const { detectTableBlocks, analyzeBlockStructure } = await import(
			"@rindrics/tblparse"
		);

		const arrayBuffer = await file.arrayBuffer();
		const workbook = XLSX.read(arrayBuffer, { type: "array" });

		// Parse all sheets
		const sheetsData: SheetData[] = workbook.SheetNames.map(
			(sheetName: string) => {
				const sheet = workbook.Sheets[sheetName];
				const detectedBlocks = detectTableBlocks(sheet);

				const blocks = detectedBlocks.map((block) => {
					const structure = analyzeBlockStructure(block);
					const data = extractBlockData(XLSX, sheet, block);
					return {
						block,
						title: structure.titleRow?.labelValue,
						data,
					};
				});

				return {
					name: sheetName,
					blocks,
				};
			},
		);

		setSheets(sheetsData);
		setActiveSheet(0);
	};

	const currentSheet = sheets[activeSheet];

	return (
		<div className="container">
			<header className="header">
				<h1>tblparse Demo</h1>
				<p className="subtitle">Detect table blocks from Excel/CSV files</p>
			</header>

			<main className="main">
				<section className="upload-section">
					<label className="file-input-label">
						<input
							type="file"
							accept=".xlsx,.xls,.csv"
							onChange={handleFileChange}
							className="file-input"
						/>
						<span className="file-input-button">Select file</span>
						{fileName && <span className="file-name">{fileName}</span>}
					</label>
				</section>

				{sheets.length > 0 && (
					<section className="results-section">
						{/* Sheet tabs */}
						{sheets.length > 1 && (
							<div className="sheet-tabs">
								{sheets.map((sheet, index) => (
									<button
										type="button"
										key={sheet.name}
										className={`sheet-tab ${index === activeSheet ? "active" : ""}`}
										onClick={() => setActiveSheet(index)}
									>
										{sheet.name}
									</button>
								))}
							</div>
						)}

						{/* Current sheet content */}
						{currentSheet && (
							<>
								<h2>
									{sheets.length > 1 && `${currentSheet.name}: `}
									Detected {currentSheet.blocks.length} blocks
								</h2>
								<div className="blocks-list">
									{currentSheet.blocks.map(({ block, title, data }, index) => (
										<div key={`block-${block.startRow}`} className="block-card">
											<div className="block-header">
												<span className="block-title">
													{title || `Block ${index + 1}`}
												</span>
												<span className="block-range">
													Rows {block.startRow} - {block.endRow}
												</span>
											</div>
											<div className="table-wrapper">
												<table className="data-table">
													<tbody>
														{(title ? data.slice(1) : data).map(
															(row, rowIdx) => (
																<tr key={`row-${block.startRow}-${rowIdx}`}>
																	{row.map((cell, colIdx) => (
																		<td
																			key={`cell-${block.startRow}-${rowIdx}-${colIdx}`}
																		>
																			{cell}
																		</td>
																	))}
																</tr>
															),
														)}
													</tbody>
												</table>
											</div>
										</div>
									))}
									{currentSheet.blocks.length === 0 && (
										<p className="no-blocks">
											No blocks detected in this sheet
										</p>
									)}
								</div>
							</>
						)}
					</section>
				)}
			</main>

			<footer className="footer">
				<p>
					Powered by{" "}
					<a
						href="https://www.npmjs.com/package/@rindrics/tblparse"
						target="_blank"
						rel="noopener noreferrer"
					>
						@rindrics/tblparse
					</a>
				</p>
			</footer>
		</div>
	);
}

function extractBlockData(
	XLSX: typeof import("xlsx"),
	sheet: WorkSheet,
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

export default App;
