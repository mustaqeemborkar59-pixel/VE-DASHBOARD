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
 * Renders a compact horizontal salary slip in Black and White with reduced font sizes.
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

    const grossEarnings = (salary.baseSalary || 0) + (salary.da || 0) + (salary.hra || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.pt || 0) + (salary.lwf || 0) + (salary.advance || 0);

    // --- Background Watermark "VE" ---
    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.05 });
    doc.setGState(gState);
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

    // --- Dashed Separator Line ---
    doc.setLineDash([1, 1], 0);
    doc.line(14, currentY, 196, currentY);
    doc.setLineDash([], 0);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 8;

    // --- Employee Info Section (Two-Column Layout) ---
    doc.setFontSize(8);
    
    // Left Column
    const leftX = 14;
    doc.setFont('helvetica', 'bold');
    doc.text("Name of Employee:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.fullName, leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Bank A/C No:", leftX, currentY); 
    doc.setFont('helvetica', 'normal');
    doc.text(employee.bankAccountNumber || 'N/A', leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Bank Name:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.bankName || 'N/A', leftX + 35, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("UAN Number:", leftX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.uanNumber || 'N/A', leftX + 35, currentY);

    // Right Column
    currentY -= 15;
    const rightX = 110;

    doc.setFont('helvetica', 'bold');
    doc.text("Designation:", rightX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.specialization || 'N/A', rightX + 40, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("ESIC NO:", rightX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.esicNumber || 'N/A', rightX + 40, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("PF No:", rightX, currentY); 
    doc.setFont('helvetica', 'normal');
    doc.text(employee.pfNumber || 'N/A', rightX + 40, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Month:", rightX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(monthDisplay, rightX + 40, currentY);

    currentY += 10;

    // --- Earnings Section ---
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
            cellPadding: 1.2, 
            fontSize: 8, 
            halign: 'center', 
            minCellHeight: 5, 
            textColor: [0, 0, 0],
            font: 'helvetica'
        },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            lineWidth: 0.1 
        }
    });

    // --- Deductions Section ---
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
            cellPadding: 1.2, 
            fontSize: 8, 
            halign: 'center', 
            minCellHeight: 5, 
            textColor: [0, 0, 0],
            font: 'helvetica'
        },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            lineWidth: 0.1 
        }
    });

    // --- Final Summary Section ---
    currentY = (doc as any).lastAutoTable.finalY + 4;
    const formattedNetPay = salary.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    autoTable(doc, {
        startY: currentY,
        body: [[
            { 
                content: `NET PAYABLE SALARY: Rs. ${formattedNetPay}/-`, 
                styles: { 
                    halign: 'center', 
                    fontStyle: 'bold',
                    fontSize: 8, 
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0]
                } 
            }
        ]],
        theme: 'grid',
        styles: { 
            cellPadding: 1.5, 
            minCellHeight: 6, 
            textColor: [0, 0, 0],
            font: 'helvetica'
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY);

    // --- Signature / Footer Section ---
    const sigY = currentY + 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Position signature labels
    doc.text("Employee Signature", 50, sigY, { align: 'center' });
    doc.text("Authorized Signatory", 160, sigY, { align: 'center' });
    
    // Note about system generation
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text("Note: This is a system generated document and does not require a physical signature.", 105, sigY + 8, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`System Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, sigY + 13, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    renderSingleSlip(doc, 0, salary, employee, company);
    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
