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

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF();
    const netSalaryWords = toWords.convert(salary.netSalary).toUpperCase();
    const monthDisplay = format(parseISO(`${salary.month}-01`), 'MMMM yyyy').toUpperCase();
    const paymentDateDisplay = salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A';

    // --- Background Watermark "VE" ---
    // Using a very light gray color [245, 245, 245] for the faded effect
    doc.setTextColor(245, 245, 245);
    doc.setFontSize(150);
    doc.setFont('helvetica', 'bold');
    // Rotate 45 degrees and place in the center of the A4 page (105, 150)
    doc.text("VE", 105, 150, { 
        align: 'center', 
        angle: 45 
    });
    // Reset text color to black for the rest of the content
    doc.setTextColor(0, 0, 0);

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text("SALARY SLIP", 105, 30, { align: 'center' });
    doc.line(90, 31, 120, 31); // Underline

    // Employee & Month Info
    autoTable(doc, {
        startY: 40,
        body: [
            [
                { content: `Employee Name: ${employee.fullName}`, styles: { fontStyle: 'bold' } },
                { content: `Month: ${monthDisplay}`, styles: { fontStyle: 'bold' } }
            ],
            [
                { content: `Designation: ${employee.specialization || 'N/A'}`, styles: { fontStyle: 'bold' } },
                { content: `Payment Date: ${paymentDateDisplay}`, styles: { fontStyle: 'bold' } }
            ]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 95 } }
    });

    // Salary Table
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Particulars', 'Amount (INR)']],
        body: [
            ['Basic Salary', salary.baseSalary.toLocaleString('en-IN')],
            ['Bonus / Incentives', salary.bonus.toLocaleString('en-IN')],
            ['Deductions', `(-) ${salary.deductions.toLocaleString('en-IN')}`],
            [{ content: 'Net Salary Payable', styles: { fontStyle: 'bold' } }, { content: salary.netSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right' } }]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    // Amount in words
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, finalY + 10);

    // Signatures
    const sigY = finalY + 40;
    doc.setFont('helvetica', 'normal');
    doc.text("____________________", 40, sigY, { align: 'center' });
    doc.text("Employee Signature", 40, sigY + 5, { align: 'center' });

    doc.text("____________________", 160, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY + 5, { align: 'center' });

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
