
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
 * Renders a compact and professional salary slip.
 * Updated to include Basic, DA, HRA, OT, PF, ESIC, PT, LWF, Advance.
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
                { content: `Designation: ${employee.specialization || 'N/A'}`, styles: { fontSize: 9 } },
                { content: `Payment Date: ${paymentDateDisplay}`, styles: { fontSize: 9 } }
            ]
        ],
        theme: 'grid',
        styles: { cellPadding: 2, fontSize: 9 },
        columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } }
    });

    // --- Combined Earnings and Deductions Table ---
    const tableStartY = (doc as any).lastAutoTable.finalY + 3;
    autoTable(doc, {
        startY: tableStartY,
        head: [['Earnings', 'Amount (INR)', 'Deductions', 'Amount (INR)']],
        body: [
            ['Basic Salary', (salary.baseSalary || 0).toLocaleString('en-IN'), 'P.F.', (salary.pf || 0).toLocaleString('en-IN')],
            ['D.A.', (salary.da || 0).toLocaleString('en-IN'), 'E.S.I.C.', (salary.esic || 0).toLocaleString('en-IN')],
            ['H.R.A.', (salary.hra || 0).toLocaleString('en-IN'), 'P.T. (Prof. Tax)', (salary.pt || 0).toLocaleString('en-IN')],
            ['O.T. (Overtime)', (salary.ot || 0).toLocaleString('en-IN'), 'L.W.F.', (salary.lwf || 0).toLocaleString('en-IN')],
            ['', '', 'Advance', (salary.advance || 0).toLocaleString('en-IN')],
            [
                { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
                { content: grossEarnings.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right' } },
                { content: 'Gross Deductions', styles: { fontStyle: 'bold' } },
                { content: totalDeductions.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right' } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            1: { halign: 'right' },
            3: { halign: 'right' }
        }
    });

    // --- Final Net Pay Section ---
    const summaryStartY = (doc as any).lastAutoTable.finalY + 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE: ${salary.netSalary.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 105, summaryStartY + 5, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`In words: ${netSalaryWords}`, 14, summaryStartY + 12);

    // --- Signature Section ---
    const sigY = summaryStartY + 30;
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

    // Render single slip
    renderSingleSlip(doc, 0, salary, employee, company);

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
