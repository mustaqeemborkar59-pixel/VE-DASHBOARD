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
    filters: { company?: string; month?: string; year?: string }
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${enterprise.toUpperCase()} ENTERPRISES`, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PAYMENT SUMMARY STATEMENT', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, p')}`, pageWidth - 15, 30, { align: 'right' });

    // Filter Info
    let filterText = `Statement for: ${filters.year !== 'All' ? filters.year : 'All Years'}`;
    if (filters.month && filters.month !== 'All') {
        filterText += ` | ${filters.month}`;
    }
    doc.text(filterText, 15, 30);

    if (filters.company && filters.company !== 'All') {
        doc.setFont('helvetica', 'bold');
        doc.text(`Client: ${filters.company}`, 15, 35);
    }

    // Table Data
    const tableBody = invoices.map(inv => [
        `${inv.billNo}-${inv.billNoSuffix || 'MHE'}`,
        format(new Date(inv.billDate), 'dd-MMM-yy'),
        inv.grandTotal.toLocaleString('en-IN'),
        inv.totalPaid.toLocaleString('en-IN'),
        inv.tdsAmount.toLocaleString('en-IN'),
        inv.balance.toLocaleString('en-IN'),
    ]);

    // Totals
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
    const totalTds = invoices.reduce((sum, inv) => sum + inv.tdsAmount, 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    autoTable(doc, {
        startY: 40,
        head: [['Bill No.', 'Date', 'Billed Amt', 'Received', 'TDS', 'Balance']],
        body: tableBody,
        foot: [[
            'TOTAL', 
            '', 
            totalBilled.toLocaleString('en-IN'), 
            totalPaid.toLocaleString('en-IN'), 
            totalTds.toLocaleString('en-IN'), 
            totalBalance.toLocaleString('en-IN')
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
        },
        styles: { fontSize: 8, cellPadding: 2 },
    });

    // Final Summary Box
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(15, finalY, pageWidth - 30, 25, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, finalY + 7);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Outstanding Balance:`, 20, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text(`INR ${totalBalance.toLocaleString('en-IN')}/-`, pageWidth - 25, finalY + 15, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('* This is a system generated payment status summary.', pageWidth / 2, finalY + 35, { align: 'center' });

    const fileName = `Payment_Summary_${enterprise}_${filters.company?.replace(/\s+/g, '_') || 'All'}.pdf`;
    doc.save(fileName);
};
