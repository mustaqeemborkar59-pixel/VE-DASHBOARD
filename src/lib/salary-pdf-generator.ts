
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
 * Renders a single salary slip at a specific Y offset on the document.
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

    // --- Background Watermark "VE" ---
    // Using a very light grey color for watermark compatibility
    doc.setTextColor(248, 248, 248); 
    doc.setFontSize(100);
    doc.setFont('helvetica', 'bold');
    doc.text("VE", 105, yOffset + 75, { 
        align: 'center', 
        angle: 45 
    });
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16); // Company Name
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 180) : [];
    let currentY = yOffset + 21;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 4.5;
    });

    if (company.gstin || company.pan) {
        const details = `${company.gstin ? `GSTIN: ${company.gstin}` : ''} ${company.pan ? ` | PAN: ${company.pan}` : ''}`;
        doc.text(details, 105, currentY, { align: 'center' });
        currentY += 6;
    }

    doc.setFontSize(14); // Slip Title
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(65, currentY + 1.5, 145, currentY + 1.5); 
    currentY += 9;

    // --- Employee & Month Info Section ---
    autoTable(doc, {
        startY: currentY,
        body: [
            [
                { content: `Employee: ${employee.fullName}`, styles: { fontStyle: 'bold', fontSize: 12 } },
                { content: `Month: ${monthDisplay}`, styles: { fontStyle: 'bold', fontSize: 12 } }
            ],
            [
                { content: `Role: ${employee.specialization || 'N/A'}`, styles: { fontSize: 11 } },
                { content: `Payment Date: ${paymentDateDisplay}`, styles: { fontSize: 11 } }
            ]
        ],
        theme: 'grid',
        styles: { cellPadding: 2.5, cellWidth: 'wrap' },
        columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 95 } }
    });

    // --- Salary Table Section ---
    const tableStartY = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
        startY: tableStartY,
        head: [['Particulars', 'Amount (INR)']],
        body: [
            ['Basic Salary', { content: salary.baseSalary.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Bonus / Incentives', { content: salary.bonus.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Deductions', { content: `(-) ${salary.deductions.toLocaleString('en-IN')}`, styles: { halign: 'right', textColor: [200, 0, 0] } }],
            [
                { content: 'Net Salary Payable', styles: { fontStyle: 'bold', fontSize: 13 } }, 
                { content: salary.netSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right', fontSize: 13 } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 12 },
        styles: { fontSize: 12, cellPadding: 3.5 }
    });

    // --- Amount in Words ---
    const finalTableY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text(`In words: ${netSalaryWords}`, 14, finalTableY + 9);

    // --- Signature Section ---
    const sigY = finalTableY + 28;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text("________________________", 50, sigY, { align: 'center' });
    doc.text("Employee Signature", 50, sigY + 5, { align: 'center' });

    doc.text("________________________", 160, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY + 5, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, yOffset + 143, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Render first copy (Top)
    renderSingleSlip(doc, 0, salary, employee, company);

    // Draw a dashed cutting line in the middle
    // Fix: Using setLineDash function instead of setDash
    if (typeof doc.setLineDash === 'function') {
        doc.setLineDash([2, 2], 0);
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(0, 148.5, 210, 148.5);
    
    // Reset to solid line
    if (typeof doc.setLineDash === 'function') {
        doc.setLineDash([], 0);
    }

    // Render second copy (Bottom)
    renderSingleSlip(doc, 148.5, salary, employee, company);

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
