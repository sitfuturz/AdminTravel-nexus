import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import 'jspdf-autotable';
const jsPDF = require('jspdf').jsPDF;
require('jspdf-autotable');

// Extend jsPDF type definition
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Export data to Excel file
   * @param data Array of objects to export
   * @param fileName Name of the file without extension
   */
  
  async exportToExcel(data: any[], fileName: string): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Referrals');
    
    // Get headers from the first data object
    const headers = Object.keys(data[0]);
    
    // Add header row
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4E73DF' } // Blue color matching your UI
    };
    headerRow.font.color = { argb: 'FFFFFF' }; // White text
    
    // Add data rows
    data.forEach(item => {
      const rowValues = headers.map(header => item[header]);
      worksheet.addRow(rowValues);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value?.toString() || '';
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        column.width = Math.min(maxLength + 2, 30); // Set width with max limit
      }
    });
    
    // Add border to all cells
    worksheet.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  }

  /**
   * Export data to PDF file
   * @param columns Column definitions for the PDF table
   * @param data Array of objects to export
   * @param title Title for the PDF document
   * @param subtitle Subtitle for the PDF document (optional)
   * @param fileName Name of the file without extension
   */
  async exportToPDF(
    columns: Array<{ header: string; dataKey: string }>,
    data: any[],
    title: string,
    subtitle: string = '',
    fileName: string
  ): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55); // Dark blue/gray text
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    // Add subtitle if provided
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128); // Medium gray text
      doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    }
    
    // Add date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.setFontSize(10);
    doc.text(`Generated on: ${dateStr}`, doc.internal.pageSize.getWidth() - 20, 10, { align: 'right' });
    
    // Define table styles
    const tableConfig = {
      startY: subtitle ? 30 : 25,
      headStyles: {
        fillColor: [78, 115, 223], // Primary blue color from your UI
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      columnStyles: {
        // Custom column styles if needed
        srNo: { cellWidth: 15 },
        rating: { cellWidth: 20 }
      },
      didDrawPage: (data: any) => {
        // Custom header for each page
        if (data.pageNumber > 1) {
          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        }
        
        // Footer with page numbers
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        doc.setFontSize(10);
        doc.setTextColor(150);
        const totalPages = doc.internal.pages.length - 1;
        const pageText = `Page ${data.pageNumber} of ${totalPages}`;
        doc.text(pageText, pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
      }
    };
    
  
    
    doc.autoTable({
      ...tableConfig,
      columns: columns,
      body: data
    });
    
    
 
    doc.save(`${fileName}.pdf`);
  }
}