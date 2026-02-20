
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
 * Optimized for a compact layout.
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
    doc.setTextColor(245, 245, 245); 
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text("VE", 105, yOffset + 60, { 
        align: 'center', 
        angle: 45 
    });
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14); // Company Name
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 12, { align: 'center' });
    
    doc.setFontSize(9);
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

    doc.setFontSize(12); // Slip Title
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 6;

    // --- Employee & Month Info Section ---
    autoTable(doc, {
        startY: currentY,
        body: [
            [
                { content: `Employee: ${employee.fullName}`, styles: { fontStyle: 'bold', fontSize: 10 } },
                { content: `Month: ${monthDisplay}`, styles: { fontStyle: 'bold', fontSize: 10 } }
            ],
            [
                { content: `Role: ${employee.specialization || 'N/A'}`, styles: { fontSize: 9 } },
                { content: `Payment Date: ${paymentDateDisplay}`, styles: { fontSize: 9 } }
            ]
        ],
        theme: 'grid',
        styles: { cellPadding: 2, fontSize: 9 },
        columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } }
    });

    // --- Salary Table Section ---
    const tableStartY = (doc as any).lastAutoTable.finalY + 3;
    autoTable(doc, {
        startY: tableStartY,
        head: [['Particulars', 'Amount (INR)']],
        body: [
            ['Basic Salary', { content: salary.baseSalary.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Bonus / Incentives', { content: salary.bonus.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Deductions', { content: `(-) ${salary.deductions.toLocaleString('en-IN')}`, styles: { halign: 'right', textColor: [200, 0, 0] } }],
            [
                { content: 'Net Salary Payable', styles: { fontStyle: 'bold', fontSize: 11 } }, 
                { content: salary.netSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right', fontSize: 11 } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 3 }
    });

    // --- Amount in Words ---
    const finalTableY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`In words: ${netSalaryWords}`, 14, finalTableY + 7);

    // --- Signature Section ---
    const sigY = finalTableY + 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("________________________", 50, sigY, { align: 'center' });
    doc.text("Employee Signature", 50, sigY + 4, { align: 'center' });

    doc.text("________________________", 160, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY + 4, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, sigY + 12, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Render single slip at the top
    renderSingleSlip(doc, 0, salary, employee, company);

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
