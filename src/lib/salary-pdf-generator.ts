'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import type { Salary, Employee, CompanySettings } from './data';

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: true,
      ignoreZeroCurrency: false,
    }
});

/**
 * Helper to load an image from a URL and return a promise.
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
};

/**
 * Renders a clean, compact, Black and White horizontal salary slip.
 */
const renderSingleSlip = (
    doc: jsPDF,
    yOffset: number,
    salary: Salary,
    employee: Employee,
    company: CompanySettings,
    logoImg?: HTMLImageElement
) => {
    const netSalaryWords = toWords.convert(salary.netSalary).toUpperCase();
    const monthDisplay = format(parseISO(`${salary.month}-01`), 'MMMM yyyy').toUpperCase();

    const grossEarnings = (salary.baseSalary || 0) + (salary.da || 0) + (salary.hra || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.pt || 0) + (salary.lwf || 0) + (salary.advance || 0);

    // --- Background Watermark Image (Render first to be at back) ---
    if (logoImg) {
        doc.saveGraphicsState();
        // Set opacity to 15% (0.15)
        const gState = new (doc as any).GState({ opacity: 0.15 });
        doc.setGState(gState);
        
        // Centering the logo on A4 (210mm x 297mm)
        const imgWidth = 120;
        const imgHeight = 120;
        const x = (210 - imgWidth) / 2;
        const y = yOffset + 80; 
        
        doc.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
        doc.restoreGraphicsState();
    }
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(19); 
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 12, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 170) : [];
    let currentY = yOffset + 17;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 3.5;
    });

    if (company.gstin || company.pan) {
        const details = `${company.gstin ? `GSTIN: ${company.gstin}` : ''} ${company.pan ? ` | PAN: ${company.pan}` : ''}`;
        doc.text(details, 105, currentY, { align: 'center' });
        currentY += 5;
    }

    // --- Title with Dashed Lines ---
    doc.setLineDash([1, 1], 0);
    doc.line(14, currentY, 196, currentY); 
    currentY += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 2;

    doc.line(14, currentY, 196, currentY); 
    doc.setLineDash([], 0);
    currentY += 8;

    // --- Employee Info ---
    doc.setFontSize(8);
    const leftX = 14;
    doc.setFont('helvetica', 'bold');
    doc.text("Name of Employee:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.fullName, leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Bank Name:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.bankName || 'N/A', leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Bank A/C No:", leftX, currentY); 
    doc.setFont('helvetica', 'normal');
    doc.text(employee.bankAccountNumber || 'N/A', leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("UAN Number:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.uanNumber || 'N/A', leftX + 35, currentY);

    const infoSectionY = currentY - 15;
    const rightX = 110;

    doc.setFont('helvetica', 'bold');
    doc.text("Month:", rightX, infoSectionY);
    doc.setFont('helvetica', 'normal');
    doc.text(monthDisplay, rightX + 40, infoSectionY);
    
    doc.setFont('helvetica', 'bold');
    doc.text("Designation:", rightX, infoSectionY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.specialization || 'N/A', rightX + 40, infoSectionY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text("ESIC NO:", rightX, infoSectionY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.esicNumber || 'N/A', rightX + 40, infoSectionY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text("PF No:", rightX, infoSectionY + 15); 
    doc.setFont('helvetica', 'normal');
    doc.text(employee.pfNumber || 'N/A', rightX + 40, infoSectionY + 15);

    currentY += 10;

    // --- Earnings Table ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("EARNINGS", 14, currentY);
    currentY += 2;
    
    autoTable(doc, {
        startY: currentY,
        head: [['Basic Salary', 'D.A.', 'H.R.A.', 'O.T.', 'Gross Earnings']],
        body: [[
            (salary.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.da || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.hra || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.ot || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            { content: grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: { 
            cellPadding: 1.5, 
            fontSize: 8, 
            halign: 'center', 
            minCellHeight: 6, 
            textColor: [0, 0, 0],
            font: 'helvetica',
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Deductions Table ---
    currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("DEDUCTIONS", 14, currentY);
    currentY += 2;

    autoTable(doc, {
        startY: currentY,
        head: [['P.F.', 'E.S.I.C.', 'P.T.', 'L.W.F.', 'Advance', 'Total Deductions']],
        body: [[
            (salary.pf || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.esic || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.pt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.lwf || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            (salary.advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            { content: totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: { 
            cellPadding: 1.5, 
            fontSize: 8, 
            halign: 'center', 
            minCellHeight: 6, 
            textColor: [0, 0, 0],
            font: 'helvetica',
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Final Summary ---
    currentY = (doc as any).lastAutoTable.finalY + 4;
    const formattedNetPay = salary.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE SALARY: Rs. ${formattedNetPay}/-`, 14, currentY + 4);

    currentY += 8;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY);

    const sigY = currentY + 15;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text("Note: This is a system generated salary slip and does not require a physical signature.", 105, sigY, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`System Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, sigY + 5, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    let logoImg: HTMLImageElement | undefined;
    try {
        // Logo must be placed in public/velogo.png
        logoImg = await loadImage('/velogo.png');
    } catch (e) {
        console.warn("Logo image could not be loaded for watermark. Ensure public/velogo.png exists.");
    }

    renderSingleSlip(doc, 0, salary, employee, company, logoImg);
    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};