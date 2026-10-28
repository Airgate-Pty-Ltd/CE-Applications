import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Paragraph, HeadingLevel, AlignmentType, Table, TableRow, TableCell } from 'docx';
import { query } from '../database/connection.js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReportGenerator {
	constructor() {
		this.outputDir = path.join(__dirname, '../../reports');
	}

	async generateGapReport(customerId, standardId, analysisId) {
		const analysis = await this.getAnalysisData(customerId, standardId, analysisId);
		await fsp.mkdir(this.outputDir, { recursive: true });
		const word = await this.generateWord(analysis);
		const excel = await this.generateExcel(analysis);
		const pdf = await this.generatePDF(analysis);
		return { word, excel, pdf, gapCount: analysis.gapCount };
	}

	async getAnalysisData(customerId, standardId, analysisId) {
		// Minimal viable query set using available tables
		const standard = await query(`SELECT id, code, name FROM standards WHERE id = $1`, [standardId]);
		if (standard.rows.length === 0) throw new Error('Standard not found');
		const customer = await query(`SELECT id, name FROM tenants WHERE id = $1`, [customerId]);
		if (customer.rows.length === 0) throw new Error('Customer not found');

		// Use correlation matrix as the "analysis"
		const gaps = await query(
			`SELECT pc.id as requirement_id, ccm.procedure_id, ccm.confidence_score as match_confidence,
              pc.clause_number, pc.clause_title, pc.clause_text, pc.common_gaps,
              ccm.compliance_status
       FROM clause_correlation_matrix ccm
       JOIN parsed_clauses pc ON ccm.clause_id = pc.id
       WHERE ccm.standard_id = $1 AND ccm.tenant_id = $2
       ORDER BY ccm.confidence_score ASC`,
			[standardId, customerId]
		);

		const coveredCount = gaps.rows.filter(r => r.compliance_status === 'full').length;
		return {
			analysis: {
				id: analysisId || null,
				code: standard.rows[0].code,
				name: standard.rows[0].name,
				customer_name: customer.rows[0].name,
				analyzed_at: new Date().toISOString()
			},
			gaps: gaps.rows,
			coveredCount,
			gapCount: gaps.rows.length - coveredCount,
			gapPercentage: gaps.rows.length ? Math.round(((gaps.rows.length - coveredCount) / gaps.rows.length) * 100) : 0
		};
	}

	async generateWord(analysisData) {
		const sections = [];
		sections.push(
			new Paragraph({
				text: 'COMPLIANCE GAP ANALYSIS REPORT',
				heading: HeadingLevel.HEADING_1,
				alignment: AlignmentType.CENTER
			})
		);
		sections.push(new Paragraph({ text: ' ' }));
		sections.push(new Paragraph({ text: `Customer: ${analysisData.analysis.customer_name}` }));
		sections.push(new Paragraph({ text: `Standard: ${analysisData.analysis.code} – ${analysisData.analysis.name}` }));
		sections.push(new Paragraph({ text: `Date: ${new Date(analysisData.analysis.analyzed_at).toLocaleDateString()}` }));
		sections.push(new Paragraph({ text: ' ' }));
		sections.push(
			new Table({
				rows: [
					new TableRow({
						cells: [new TableCell({ children: [new Paragraph('Total Requirements')] }), new TableCell({ children: [new Paragraph(String(analysisData.gaps.length))] })]
					}),
					new TableRow({
						cells: [new TableCell({ children: [new Paragraph('Covered')] }), new TableCell({ children: [new Paragraph(String(analysisData.coveredCount))] })]
					}),
					new TableRow({
						cells: [new TableCell({ children: [new Paragraph('Gaps')] }), new TableCell({ children: [new Paragraph(String(analysisData.gapCount))] })]
					}),
					new TableRow({
						cells: [new TableCell({ children: [new Paragraph('Gap Percentage')] }), new TableCell({ children: [new Paragraph(String(analysisData.gapPercentage) + '%')] })]
					})
				]
			})
		);
		sections.push(new Paragraph({ text: ' ' }));
		sections.push(new Paragraph({ text: 'IDENTIFIED GAPS', heading: HeadingLevel.HEADING_2 }));

		const doc = new Document({ sections: [{ children: sections }] });
		const fileName = `gap_report_${Date.now()}.docx`;
		const filePath = path.join(this.outputDir, fileName);
		const buffer = await doc.pack();
		await fsp.writeFile(filePath, buffer);
		return { fileName, filePath, format: 'docx' };
	}

	async generateExcel(analysisData) {
		const workbook = new ExcelJS.Workbook();
		const summarySheet = workbook.addWorksheet('Summary');
		summarySheet.columns = [
			{ header: 'Metric', key: 'metric', width: 30 },
			{ header: 'Value', key: 'value', width: 40 }
		];
		summarySheet.addRows([
			{ metric: 'Standard', value: `${analysisData.analysis.code} – ${analysisData.analysis.name}` },
			{ metric: 'Customer', value: analysisData.analysis.customer_name },
			{ metric: 'Analysis Date', value: new Date(analysisData.analysis.analyzed_at).toLocaleDateString() },
			{ metric: 'Total Requirements', value: analysisData.gaps.length },
			{ metric: 'Covered', value: analysisData.coveredCount },
			{ metric: 'Gaps', value: analysisData.gapCount },
			{ metric: 'Gap %', value: `${analysisData.gapPercentage}%` }
		]);

		const gapsSheet = workbook.addWorksheet('Gaps');
		gapsSheet.columns = [
			{ header: 'Clause #', key: 'clause_number', width: 15 },
			{ header: 'Title', key: 'clause_title', width: 40 },
			{ header: 'Requirement Text', key: 'clause_text', width: 60 },
			{ header: 'Confidence %', key: 'confidence', width: 15 },
			{ header: 'Status', key: 'status', width: 12 }
		];
		gapsSheet.addRows(
			analysisData.gaps.map(g => ({
				clause_number: g.clause_number,
				clause_title: g.clause_title,
				clause_text: (g.clause_text || '').substring(0, 200),
				confidence: Math.round((g.match_confidence || 0) * 100),
				status: g.compliance_status?.toUpperCase() || 'UNKNOWN'
			}))
		);

		const fileName = `gap_report_${Date.now()}.xlsx`;
		const filePath = path.join(this.outputDir, fileName);
		await workbook.xlsx.writeFile(filePath);
		return { fileName, filePath, format: 'xlsx' };
	}

	async generatePDF(analysisData) {
		const fileName = `gap_report_${Date.now()}.pdf`;
		const filePath = path.join(this.outputDir, fileName);
		const doc = new PDFDocument({ margin: 36 });
		const stream = fs.createWriteStream(filePath);
		doc.pipe(stream);
		doc.fontSize(18).text('COMPLIANCE GAP ANALYSIS REPORT', { align: 'center' }).moveDown();
		doc.fontSize(12).text(`Customer: ${analysisData.analysis.customer_name}`);
		doc.text(`Standard: ${analysisData.analysis.code} – ${analysisData.analysis.name}`);
		doc.text(`Date: ${new Date(analysisData.analysis.analyzed_at).toLocaleDateString()}`).moveDown();
		doc.text(`Total Requirements: ${analysisData.gaps.length}`);
		doc.text(`Covered: ${analysisData.coveredCount}`);
		doc.text(`Gaps: ${analysisData.gapCount}`);
		doc.text(`Gap Percentage: ${analysisData.gapPercentage}%`).moveDown();
		doc.fontSize(14).text('Identified Gaps', { underline: true }).moveDown(0.5);
		analysisData.gaps.slice(0, 50).forEach((g, i) => {
			doc.fontSize(10).text(`${i + 1}. ${g.clause_number} – ${g.clause_title}`);
			doc.text(`Confidence: ${Math.round((g.match_confidence || 0) * 100)}%`).moveDown(0.3);
		});
		doc.end();
		await new Promise((resolve, reject) => {
			stream.on('finish', resolve);
			stream.on('error', reject);
		});
		return { fileName, filePath, format: 'pdf' };
	}
}

export default ReportGenerator;


