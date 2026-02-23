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
        try {
            const gState = new (doc as any).GState({ opacity: 0.10 });
            doc.setGState(gState);
        } catch (e) {
            // Fallback for some environments
        }
        const imgSize = 70; // Even more compact logo
        doc.addImage(logoImg, 'PNG', (210 - imgSize) / 2, yOffset + 25, imgSize, imgSize);
        doc.restoreGraphicsState();
    }
    
    // 1) Company Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13); // Compact size
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName.toUpperCase(), 105, yOffset + 10, { align: 'center' });
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const addressLines = company.address ? doc.splitTextToSize(company.address, 170) : [];
    let currentY = yOffset + 14.5;
    addressLines.forEach((line: string) => {
        doc.text(line, 105, currentY, { align: 'center' });
        currentY += 3.2;
    });

    const contactDetails = `${company.contactNumber ? `Contact: ${company.contactNumber}` : ''} ${company.gstin ? ` | GST: ${company.gstin}` : ''}`;
    doc.text(contactDetails, 105, currentY, { align: 'center' });
    currentY += 5;

    doc.setLineWidth(0.2);
    doc.line(14, currentY, 196, currentY); 
    currentY += 4.5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${monthDisplay}`, 105, currentY, { align: 'center' });
    currentY += 5.5;

    // 2 & 3) Employee & Period Details (Rearranged for compact look without Department)
    doc.setFontSize(7);
    const col1 = 14;
    const col2 = 50;
    const col3 = 110;
    const col4 = 145;
    
    const bankDisplay = employee.bankAccountNumber ? `****${employee.bankAccountNumber.slice(-4)}` : 'N/A';

    const drawInfoLine = (label1: string, val1: string, label2: string, val2: string) => {
        doc.setFont('helvetica', 'bold'); doc.text(label1, col1, currentY);
        doc.setFont('helvetica', 'normal'); doc.text(val1, col2, currentY);
        doc.setFont('helvetica', 'bold'); doc.text(label2, col3, currentY);
        doc.setFont('helvetica', 'normal'); doc.text(val2, col4, currentY);
        currentY += 4;
    }

    drawInfoLine("Employee Name:", employee.fullName, "Salary Month:", monthDisplay);
    drawInfoLine("Employee ID:", employee.empCode || 'N/A', "Total Work Days:", String(salary.workingDays || 0));
    drawInfoLine("Designation:", employee.specialization || 'N/A', "Present Days:", String(salary.presentDays || 0));
    drawInfoLine("Date of Joining:", employee.doj ? format(parseISO(employee.doj), 'dd/MM/yyyy') : 'N/A', "Leave / Absent:", String(salary.absentDays || 0));
    drawInfoLine("PAN Number:", employee.panNumber || 'N/A', "Pay Date:", salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A');
    drawInfoLine("UAN Number:", employee.uanNumber || 'N/A', "Bank Account:", `${employee.bankName || ''} (${bankDisplay})`);
    
    currentY += 3;

    // 4 & 5) Earnings & Deductions Tables (Side-by-Side)
    const tableY = currentY;
    
    // Earnings Table
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
            [{ content: 'Gross Total', styles: { fontStyle: 'bold' } }, { content: grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 1, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
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
            ['Other Deductions', (salary.otherDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
            [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 1, font: 'helvetica', fillColor: false },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 1: { halign: 'right' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 6) Net Salary Section (Left aligned, no border)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`NET PAYABLE SALARY: Rs. ${salary.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/-`, 14, currentY, { align: 'left' });
    
    currentY += 5;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in words: ${netSalaryWords}`, 14, currentY);

    // 7) Footer Section
    currentY += 10;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text("This is a system generated salary slip and does not require a physical signature.", 105, currentY, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, 105, currentY + 3, { align: 'center' });
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
