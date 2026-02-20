
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
 * Renders a compact horizontal salary slip.
 * Headers on top, values below. Reduced height.
 */
const renderSingleSlip = (
    doc: jsPDF,
    yOffset: number,
    salary: Salary,
    employee: Employee,
    company: CompanySettings
) => {
    const netSalaryWords = toWords.convert(salary.netSalary).toUpperCase();
    const monthDisplay = format(parseISO(`${salary.month}-01`), 'MMMM yyyy').toUpperCase();
    const paymentDateDisplay = salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A';

    const grossEarnings = (salary.baseSalary || 0) + (salary.da || 0) + (salary.hra || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.pt || 0) + (salary.lwf || 0) + (salary.advance || 0);

    // --- Background Watermark "VE" ---
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.setTextColor(150, 150, 150); 
    doc.setFontSize(100);
    doc.setFont('helvetica', 'bold');
    doc.text("VE", 105, yOffset + 70, { 
        align: 'center', 
        angle: 45 
    });
    doc.restoreGraphicsState();
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 12, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 170) : [];
    let currentY = yOffset + 17;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 4;
    });

    if (company.gstin || company.pan) {
        const details = `${company.gstin ? `GSTIN: ${company.gstin}` : ''} ${company.pan ? ` | PAN: ${company.pan}` : ''}`;
        doc.text(details, 105, currentY, { align: 'center' });
        currentY += 5;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 5;

    // --- Employee Info Section (Horizontal Table) ---
    autoTable(doc, {
        startY: currentY,
        head: [['Employee Name', 'Designation', 'Month', 'Payment Date']],
        body: [[employee.fullName, employee.specialization || 'N/A', monthDisplay, paymentDateDisplay]],
        theme: 'grid',
        styles: { cellPadding: 1.5, fontSize: 9, minCellHeight: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Earnings Table (Horizontal) ---
    currentY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("EARNINGS DETAILS", 14, currentY - 1);
    
    autoTable(doc, {
        startY: currentY,
        head: [['Basic Salary', 'D.A.', 'H.R.A.', 'O.T.', 'Gross Earnings']],
        body: [[
            (salary.baseSalary || 0).toLocaleString('en-IN'),
            (salary.da || 0).toLocaleString('en-IN'),
            (salary.hra || 0).toLocaleString('en-IN'),
            (salary.ot || 0).toLocaleString('en-IN'),
            { content: grossEarnings.toLocaleString('en-IN'), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: { cellPadding: 1.5, fontSize: 9, halign: 'center', minCellHeight: 6 },
        headStyles: { fillColor: [230, 245, 230], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Deductions Table (Horizontal) ---
    currentY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DEDUCTIONS DETAILS", 14, currentY - 1);

    autoTable(doc, {
        startY: currentY,
        head: [['P.F.', 'E.S.I.C.', 'P.T.', 'L.W.F.', 'Advance', 'Total Deductions']],
        body: [[
            (salary.pf || 0).toLocaleString('en-IN'),
            (salary.esic || 0).toLocaleString('en-IN'),
            (salary.pt || 0).toLocaleString('en-IN'),
            (salary.lwf || 0).toLocaleString('en-IN'),
            (salary.advance || 0).toLocaleString('en-IN'),
            { content: totalDeductions.toLocaleString('en-IN'), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: { cellPadding: 1.5, fontSize: 9, halign: 'center', minCellHeight: 6 },
        headStyles: { fillColor: [255, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Final Summary Section ---
    currentY = (doc as any).lastAutoTable.finalY + 6;
    
    // Rectangle for Net Payable
    doc.setFillColor(245, 245, 245);
    doc.rect(14, currentY, 182, 12, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE SALARY: ${salary.netSalary.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 105, currentY + 8, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY + 16);

    // --- Signature Section ---
    const sigY = currentY + 35;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("________________________", 50, sigY, { align: 'center' });
    doc.text("Employee Signature", 50, sigY + 4, { align: 'center' });

    doc.text("________________________", 160, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY + 4, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`System Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, sigY + 12, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    renderSingleSlip(doc, 0, salary, employee, company);
    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
