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

    const grossEarnings = (salary.baseSalary || 0) + (salary.hra || 0) + (salary.conveyance || 0) + (salary.medical || 0) + (salary.special || 0) + (salary.bonus || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.pt || 0) + (salary.tds || 0) + (salary.advance || 0) + (salary.otherDeductions || 0) + (salary.lwf || 0);

    // --- Watermark (10% Transparency) ---
    if (logoImg) {
        doc.saveGraphicsState();
        const gState = new (doc as any).GState({ opacity: 0.10 });
        doc.setGState(gState);
        const imgSize = 100;
        doc.addImage(logoImg, 'PNG', (210 - imgSize) / 2, yOffset + 40, imgSize, imgSize);
        doc.restoreGraphicsState();
    }
    
    // 1) Company Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18); 
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

    const contactDetails = `${company.contactNumber ? `Contact: ${company.contactNumber}` : ''} ${company.gstin ? ` | GST: ${company.gstin}` : ''}`;
    doc.text(contactDetails, 105, currentY, { align: 'center' });
    currentY += 8;

    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY); 
    currentY += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 8;

    // 2 & 3) Employee & Period Details
    doc.setFontSize(8);
    const col1 = 14;
    const col2 = 60;
    const col3 = 110;
    const col4 = 155;
    
    const bankDisplay = employee.bankAccountNumber ? `****${employee.bankAccountNumber.slice(-4)}` : 'N/A';

    doc.setFont('helvetica', 'bold'); doc.text("Employee Name:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.fullName, col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Salary Month:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(monthDisplay, col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("Employee ID:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.empCode || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Total Work Days:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.workingDays || 0), col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("Designation:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.specialization || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Present Days:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.presentDays || 0), col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("Department:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.department || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Leave / Absent:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(String(salary.absentDays || 0), col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("Date of Joining:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.doj ? format(parseISO(employee.doj), 'dd/MM/yyyy') : 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Pay Date:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A', col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("PAN Number:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.panNumber || 'N/A', col2, currentY);
    doc.setFont('helvetica', 'bold'); doc.text("Bank Account:", col3, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(`${employee.bankName || ''} (${bankDisplay})`, col4, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold'); doc.text("UAN Number:", col1, currentY);
    doc.setFont('helvetica', 'normal'); doc.text(employee.uanNumber || 'N/A', col2, currentY);
    currentY += 10;

    // 4 & 5) Earnings & Deductions Tables (Side-by-Side)
    const tableY = currentY;
    
    // Earnings
    autoTable(doc, {
        startY: tableY,
        margin: { left: 14, right: 107 },
        head: [['Earnings', 'Amount (INR)']],
        body: [
            ['Basic Salary', (salary.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['H.R.A.', (salary.hra || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Conveyance Allw.', (salary.conveyance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Medical Allw.', (salary.medical || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Special Allw.', (salary.special || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Bonus / Incentive', (salary.bonus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            ['Overtime (OT)', (salary.ot || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            [{ content: 'Total Gross Earnings', styles: { fontStyle: 'bold' } }, { content: grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Deductions
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
            ['Other Deductions', (salary.otherDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // 6) Net Salary Section (Cleaned up: Left aligned, no border)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE SALARY: Rs. ${salary.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/-`, 14, currentY + 7.5, { align: 'left' });
    
    currentY += 18;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY);

    // 7) Footer Section (Signature and Dashboard mentions removed)
    currentY += 25;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("This is a system generated salary slip and does not require a physical signature.", 105, currentY, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, currentY + 4, { align: 'center' });
};

export const generateSalaryPdfSlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    let logoImg: HTMLImageElement | undefined;
    try {
        logoImg = await loadImage('/velogo.png');
    } catch (e) {
        console.warn("Logo not found at /velogo.png");
    }

    renderSingleSlip(doc, 0, salary, employee, company, logoImg);
    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.pdf`;
    doc.save(fileName);
};
