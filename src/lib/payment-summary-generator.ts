'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

type ProcessedInvoice = {
    billNo: number;
    billNoSuffix?: string;
    billDate: string;
    companyName: string;
    grandTotal: number;
    totalPaid: number;
    tdsAmount: number;
    balance: number;
    enterprise: string;
};

export const generatePaymentSummaryPdf = (
    invoices: ProcessedInvoice[], 
    enterprise: string,
    filters: { company?: string; address?: string; month?: string; year?: string }
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Enterprise Name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${enterprise.toUpperCase()} ENTERPRISES`, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PAYMENT SUMMARY STATEMENT', pageWidth / 2, 22, { align: 'center' });
    
    // Horizontal Line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 25, pageWidth - 15, 25);

    // Filter & Client Info Section
    let currentY = 32;
    
    if (filters.company && filters.company !== 'All') {
        // Client Name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Statement for: ${filters.company}`, 15, currentY);
        currentY += 5;

        // Client Address (Left Aligned)
        if (filters.address) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const addressLines = doc.splitTextToSize(filters.address, 120); // Limit width to 120mm
            doc.text(addressLines, 15, currentY);
            currentY += (addressLines.length * 4) + 2;
        }
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Client: All Active Clients`, 15, currentY);
        currentY += 6;
    }

    // Period & Generation Date Info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    let periodText = `Period: ${filters.year !== 'All' ? filters.year : 'Lifetime'}`;
    if (filters.month && filters.month !== 'All') {
        periodText += ` (${filters.month})`;
    }
    doc.text(periodText, 15, currentY);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, p')}`, pageWidth - 15, currentY, { align: 'right' });

    // Table Data
    const tableBody = invoices.map(inv => [
        `${inv.billNo}-${inv.billNoSuffix || 'MHE'}`,
        format(new Date(inv.billDate), 'dd-MMM-yy'),
        inv.companyName,
        inv.grandTotal.toLocaleString('en-IN'),
        inv.totalPaid.toLocaleString('en-IN'),
        inv.tdsAmount.toLocaleString('en-IN'),
        inv.balance.toLocaleString('en-IN'),
    ]);

    // Totals calculation
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
    const totalTds = invoices.reduce((sum, inv) => sum + inv.tdsAmount, 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    autoTable(doc, {
        startY: currentY + 6,
        head: [['Bill No.', 'Date', 'Company', 'Billed Amt', 'Received', 'TDS', 'Balance']],
        body: tableBody,
        foot: [[
            'TOTAL', 
            '', 
            '',
            totalBilled.toLocaleString('en-IN'), 
            totalPaid.toLocaleString('en-IN'), 
            totalTds.toLocaleString('en-IN'), 
            totalBalance.toLocaleString('en-IN')
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        footStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            halign: 'right',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'center', cellWidth: 22 },
            2: { halign: 'left' },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 20 },
            6: { halign: 'right', cellWidth: 25 },
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            overflow: 'linebreak',
            lineColor: [0, 0, 0],
            lineWidth: 0.1 
        },
    });

    // Final Summary Box
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 252);
    doc.rect(15, finalY, pageWidth - 30, 25, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Outstanding Balance Summary:', 20, finalY + 7);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Total outstanding amount to be cleared:`, 20, finalY + 15);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text(`INR ${totalBalance.toLocaleString('en-IN')}/-`, pageWidth - 25, finalY + 15, { align: 'right' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('* This is a system-generated statement. Kindly review it and let us know if you find any discrepancies.', pageWidth / 2, finalY + 35, { align: 'center' });

    // Dynamic Filename
    const sanitizedCompanyName = filters.company && filters.company !== 'All' 
        ? filters.company.replace(/[^a-zA-Z0-9]/g, '_') 
        : 'All_Companies';
    const sanitizedYear = filters.year !== 'All' ? filters.year : 'Lifetime';
    
    const fileName = `Statement_${enterprise}_${sanitizedCompanyName}_${sanitizedYear}.pdf`;
    doc.save(fileName);
};