import fs from 'fs/promises';
import path from 'path';

export default class DocxReportBuilder {
  static async generate(data, outputPath) {
    const filePath = outputPath || path.join(process.cwd(), 'edcat-backend', 'uploads', `report-${Date.now()}.docx`);
    const content = `EDCAT Report\nAssessment: ${data.assessmentName}\nGenerated: ${new Date().toISOString()}`;
    await fs.writeFile(filePath, content);
    return filePath;
  }
}
