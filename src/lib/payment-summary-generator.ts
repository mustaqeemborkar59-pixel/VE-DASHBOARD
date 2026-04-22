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
    filters: { 
        company?: string; 
        address?: string; 
        gstin?: string; 
        month?: string; 
        year?: string;
        firmGstin?: string;
        firmMobile?: string;
    }
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- Professional Header Section (Edge-to-Edge Style) ---
    
    // 1. Top Row: GST (Left) and Mobile Numbers (Right) - Top Aligned
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    // Top Left - GST
    doc.text(`GSTIN: ${filters.firmGstin || 'N/A'}`, 15, 8);
    // Top Right - Mobile Numbers
    doc.text("Mob: 9821728079, 9987559327", pageWidth - 15, 8, { align: 'right' });

    // 2. Middle Row: Firm Name (Centered and Large)
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Bold Red
    doc.text(`${enterprise.toUpperCase()} ENTERPRISES`, pageWidth / 2, 21, { align: 'center' });
    
    // 3. First Red Line - Edge to Edge (0 Padding)
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(0, 25, pageWidth, 25);

    // 4. Address Line (Compact with specific properties)
    // CSS Equivalents: font-size: 8.5pt, font-family: Helvetica, text-align: center, color: black
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const addressStr = "Pratik Apartments, C - 101, Waitiwadi, Wagle Estate, Thane - 400 604. ● Email : vithal_enterprises@yahoo.in";
    doc.text(addressStr, pageWidth / 2, 30, { align: 'center' });

    // 5. Second Red Line - Edge to Edge (0 Padding)
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(0, 33, pageWidth, 33);

    let currentY = 48;
    
    // --- Date and "To" Section ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 15, currentY - 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('To,', 15, currentY);
    currentY += 6;

    if (filters.company && filters.company !== 'All') {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(filters.company.toUpperCase(), 15, currentY);
        currentY += 6;

        if (filters.address) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            const addressLines = doc.splitTextToSize(filters.address.toUpperCase(), 120);
            doc.text(addressLines, 15, currentY);
            currentY += (addressLines.length * 5) + 2;
        }

        if (filters.gstin) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`GSTIN: ${filters.gstin}`, 15, currentY);
            currentY += 10;
        }
    } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Client: All Active Clients', 15, currentY);
        currentY += 12;
    }

    // --- Subject Line ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const subject = `Subject: Balance Confirmation Statement for ${filters.month || ''} ${filters.year !== 'All' ? filters.year : ''}`.trim();
    doc.text(subject, pageWidth / 2, currentY, { align: 'center' });
    // Underline subject
    const subjWidth = doc.getTextWidth(subject);
    doc.line((pageWidth / 2) - (subjWidth / 2), currentY + 1, (pageWidth / 2) + (subjWidth / 2), currentY + 1);
    currentY += 12;

    // --- Table Data ---
    const tableBody = invoices.map(inv => [
        `${inv.billNo}-${inv.billNoSuffix || 'MHE'}`,
        format(new Date(inv.billDate), 'dd-MMM-yy'),
        inv.companyName.toUpperCase(),
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
        startY: currentY,
        head: [['Bill No.', 'Date', 'Company Name', 'Billed Amt', 'Received', 'TDS', 'Balance']],
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
        headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        footStyles: { 
            fillColor: [245, 245, 245], 
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
            5: { halign: 'right', cellWidth: 18 },
            6: { halign: 'right', cellWidth: 25 },
        },
        styles: { 
            fontSize: 8.5, 
            cellPadding: 3, 
            overflow: 'linebreak',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            font: 'helvetica'
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    
    // --- Final Summary Section ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('We request you to kindly verify the above statement and confirm the outstanding balance.', 15, finalY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Outstanding Balance: INR ${totalBalance.toLocaleString('en-IN')}/-`, 15, finalY + 7);
    
    // --- Signature Section ---
    const signY = finalY + 25;
    doc.setFontSize(10);
    doc.text('Thanking You,', 15, signY);
    doc.text(`For ${enterprise.toUpperCase()} ENTERPRISES`, 15, signY + 6);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('(Authorized Signatory)', 15, signY + 25);

    // --- Footer ---
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7.5);
    doc.text(`* This is a system-generated Balance Confirmation Letter. Generated on: ${format(new Date(), 'dd MMM yyyy, p')}`, pageWidth / 2, 285, { align: 'center' });

    // Dynamic Filename
    const sanitizedCompanyName = filters.company && filters.company !== 'All' 
        ? filters.company.replace(/[^a-zA-Z0-9]/g, '_') 
        : 'Payment_Summary';
    
    const fileName = `Balance_Confirmation_${enterprise}_${sanitizedCompanyName}.pdf`;
    doc.save(fileName);
};