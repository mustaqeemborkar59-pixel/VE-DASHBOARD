
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
    doc.setTextColor(245, 245, 245);
    doc.setFontSize(150);
    doc.setFont('helvetica', 'bold');
    doc.text("VE", 105, 150, { 
        align: 'center', 
        angle: 45 
    });
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 180) : [];
    let currentY = 26;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 5;
    });

    if (company.gstin || company.pan) {
        const details = `${company.gstin ? `GSTIN: ${company.gstin}` : ''} ${company.pan ? ` | PAN: ${company.pan}` : ''}`;
        doc.text(details, 105, currentY, { align: 'center' });
        currentY += 8;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    doc.line(60, currentY + 1, 150, currentY + 1); 
    currentY += 12;

    // --- Employee & Month Info Section ---
    autoTable(doc, {
        startY: currentY,
        body: [
            [
                { content: `Employee Name: ${employee.fullName}`, styles: { fontStyle: 'bold', fontSize: 12 } },
                { content: `Month: ${monthDisplay}`, styles: { fontStyle: 'bold', fontSize: 12 } }
            ],
            [
                { content: `Designation: ${employee.specialization || 'N/A'}`, styles: { fontSize: 12 } },
                { content: `Payment Date: ${paymentDateDisplay}`, styles: { fontSize: 12 } }
            ],
            [
                { content: `Work Location: ${employee.workLocation || 'Workshop'}`, styles: { fontSize: 12 } },
                { content: `Status: ${salary.status}`, styles: { fontStyle: 'bold', fontSize: 12 } }
            ]
        ],
        theme: 'grid',
        styles: { cellPadding: 4, cellWidth: 'wrap' },
        columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 95 } }
    });

    // --- Salary Table Section ---
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Particulars', 'Amount (INR)']],
        body: [
            ['Basic Salary', { content: salary.baseSalary.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Bonus / Incentives', { content: salary.bonus.toLocaleString('en-IN'), styles: { halign: 'right' } }],
            ['Deductions', { content: `(-) ${salary.deductions.toLocaleString('en-IN')}`, styles: { halign: 'right', textColor: [200, 0, 0] } }],
            [
                { content: 'Net Salary Payable', styles: { fontStyle: 'bold', fontSize: 14 } }, 
                { content: salary.netSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', halign: 'right', fontSize: 14 } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 12 },
        styles: { fontSize: 12, cellPadding: 5 }
    });

    // --- Amount in Words ---
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, finalY + 12);

    // --- Signature Section ---
    const sigY = finalY + 45;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text("________________________", 50, sigY, { align: 'center' });
    doc.text("Employee Signature", 50, sigY + 7, { align: 'center' });

    doc.text("________________________", 160, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY + 7, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, 285, { align: 'center' });

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
