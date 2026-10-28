/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import jsPDF from 'jspdf';

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  score: number;
  passingScore: number;
  certificateCode: string;
  issuedDate: Date;
}

export function generateCertificatePDF(data: CertificateData): Buffer {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Set colors
  const primaryColor = [14, 165, 233]; // --signal (cyan)
  const darkColor = [4, 8, 15]; // --void (dark)
  const textColor = [4, 8, 15];

  // Background pattern (subtle border)
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.rect(margin, margin, contentWidth, pageHeight - 2 * margin);

  // Inner decorative border
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin + 3, margin + 3, contentWidth - 6, pageHeight - 2 * margin - 6);

  // Organization name (top)
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFORM-EDGE QUALITY CONSULTING', pageWidth / 2, margin + 15, {
    align: 'center',
  });

  // Title
  doc.setFontSize(28);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, margin + 30, {
    align: 'center',
  });

  // Divider line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.line(margin + 20, margin + 38, pageWidth - margin - 20, margin + 38);

  // Recognition text
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('This is to certify that', pageWidth / 2, margin + 50, {
    align: 'center',
  });

  // Learner name (prominent)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(data.learnerName.toUpperCase(), pageWidth / 2, margin + 62, {
    align: 'center',
  });

  // Course completion text
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');

  const lines = doc.splitTextToSize(
    `has successfully completed the course ${data.courseTitle} with a score of ${data.score}%, exceeding the required passing score of ${data.passingScore}%.`,
    contentWidth - 40,
  );

  let yPosition = margin + 78;
  lines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  });

  // Achievement statement
  yPosition += 6;
  doc.setFont('helvetica', 'italic');
  doc.text(
    'In recognition of commitment to professional development and mastery of the course materials.',
    pageWidth / 2,
    yPosition,
    { align: 'center' },
  );

  // Signature area (decorative)
  yPosition += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ISSUED BY', margin + 20, yPosition);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.text('Conform-Edge Quality Consulting', margin + 20, yPosition + 8);
  doc.text('Authorized Signatory', margin + 20, yPosition + 14);

  // Date
  const formattedDate = data.issuedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Issued: ${formattedDate}`, pageWidth - margin - 50, yPosition + 8);

  // Certificate code (bottom, small)
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Certificate ID: ${data.certificateCode}`,
    pageWidth / 2,
    pageHeight - margin - 8,
    { align: 'center' },
  );

  // Return as Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

export function generateCertificateFileName(
  learnerName: string,
  courseTitle: string,
  certificateCode: string,
): string {
  const sanitizedName = learnerName.replace(/\s+/g, '_').toLowerCase();
  const sanitizedCourse = courseTitle.replace(/\s+/g, '_').toLowerCase();
  return `Certificate_${sanitizedName}_${sanitizedCourse}_${certificateCode}.pdf`;
}
