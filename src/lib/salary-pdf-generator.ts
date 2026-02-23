
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
        img.onerror = (err) => {
            console.error("Image load error for " + url, err);
            reject(err);
        };
        img.src = url;
    });
};

/**
 * Renders a highly structured, professional horizontal salary slip.
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

    const grossEarnings = (salary.baseSalary || 0) + (salary.da || 0) + (salary.hra || 0) + (salary.conveyance || 0) + (salary.medical || 0) + (salary.special || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.pt || 0) + (salary.tds || 0) + (salary.lwf || 0) + (salary.advance || 0);

    // --- Background Watermark Image (Rendered with 10% transparency) ---
    if (logoImg) {
        doc.saveGraphicsState();
        const gState = new (doc as any).GState({ opacity: 0.10 });
        doc.setGState(gState);
        
        const imgWidth = 120;
        const imgHeight = 120;
        const x = (210 - imgWidth) / 2;
        const y = yOffset + 30; 
        
        doc.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
        doc.restoreGraphicsState();
    }
    
    // --- Header Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20); 
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 170) : [];
    let currentY = yOffset + 20;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 4;
    });

    const contactDetails = `${company.contactNumber ? `Contact: ${company.contactNumber}` : ''} ${company.gstin ? ` | GST: ${company.gstin}` : ''} ${company.pan ? ` | PAN: ${company.pan}` : ''}`;
    doc.text(contactDetails, 105, currentY, { align: 'center' });
    currentY += 8;

    // --- Separator ---
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY); 
    currentY += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 8;

    // --- Details Grid (Employee & Period) ---
    doc.setFontSize(8);
    const col1 = 14;
    const col2 = 60;
    const col3 = 110;
    const col4 = 155;
    
    // Row 1
    doc.setFont('helvetica', 'bold'); doc.text("Employee Name:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.fullName, col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Salary Month:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(monthDisplay, col4, currentY);
    currentY += 5;

    // Row 2
    doc.setFont('helvetica', 'bold'); doc.text("Employee Code:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.empCode || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Total Work Days:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.workingDays || 0), col4, currentY);
    currentY += 5;

    // Row 3
    doc.setFont('helvetica', 'bold'); doc.text("Designation:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.specialization || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Present Days:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.presentDays || 0), col4, currentY);
    currentY += 5;

    // Row 4
    doc.setFont('helvetica', 'bold'); doc.text("Department:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.department || 'Workshop', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Leave / Absent:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.absentDays || 0), col4, currentY);
    currentY += 5;

    // Row 5
    doc.setFont('helvetica', 'bold'); doc.text("Date of Joining:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.doj ? format(parseISO(employee.doj), 'dd/MM/yyyy') : 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Pay Date:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A', col4, currentY);
    currentY += 5;

    // Row 6
    doc.setFont('helvetica', 'bold'); doc.text("PAN Number:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.panNumber || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("UAN Number:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.uanNumber || 'N/A', col4, currentY);
    currentY += 10;

    // --- Earnings & Deductions Tables (Side-by-Side) ---
    const tableY = currentY;
    
    // Earnings Table
    autoTable(doc, {
        startY: tableY,
        margin: { left: 14, right: 107 },
        head: [['Earnings', 'Amount (INR)']],
        body: [
            ['Basic Salary', (salary.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['D.A.', (salary.da || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['H.R.A.', (salary.hra || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Conveyance Allw.', (salary.conveyance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Medical Allw.', (salary.medical || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Special Allw.', (salary.special || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Overtime / Bonus', (salary.ot || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            [{ content: 'Total Earnings', styles: { fontStyle: 'bold' } }, { content: grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Deductions Table
    autoTable(doc, {
        startY: tableY,
        margin: { left: 107, right: 14 },
        head: [['Deductions', 'Amount (INR)']],
        body: [
            ['Provident Fund (PF)', (salary.pf || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['E.S.I.C.', (salary.esic || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Professional Tax', (salary.pt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['T.D.S.', (salary.tds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Loan / Advance', (salary.advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['L.W.F.', (salary.lwf || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Other Deductions', '0.00'],
            [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // --- Net Salary Section ---
    doc.setFillColor(245, 245, 245);
    doc.rect(14, currentY, 182, 12, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(14, currentY, 182, 12, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE SALARY: Rs. ${salary.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/-`, 105, currentY + 7.5, { align: 'center' });
    
    currentY += 18;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY);

    // --- Footer Section ---
    currentY += 25;
    doc.setFont('helvetica', 'bold');
    doc.text("__________________________", 35, currentY);
    doc.text("__________________________", 145, currentY);
    currentY += 5;
    doc.setFontSize(8);
    doc.text("Employee Signature", 35, currentY, { align: 'center' });
    doc.text("Authorized Signatory", 145, currentY, { align: 'center' });
    
    currentY += 15;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("This is a system generated salary slip and does not require a physical signature.", 105, currentY, { align: 'center' });
    doc.text(`Generated via VE Dashboard on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, currentY + 4, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    let logoImg: HTMLImageElement | undefined;
    try {
        logoImg = await loadImage('/velogo.png');
    } catch (e) {
        console.warn("Watermark logo not found.");
    }

    renderSingleSlip(doc, 0, salary, employee, company, logoImg);
    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
