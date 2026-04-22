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

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject('Server environment');
            return;
        }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            // Silently reject if image is missing to prevent app-breaking errors
            reject(err);
        };
        img.src = url;
    });
};

export const generatePaymentSummaryPdf = async (
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
        customSubject?: string;
        customDescription?: string;
    }
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Ensure global character spacing is reset at the start
    if ((doc as any).setCharSpace) {
        (doc as any).setCharSpace(0);
    }

    // --- Professional Header Section ---
    
    // 1. Top Row: GST (Left) and Mobile Numbers (Right)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(`GSTIN: ${filters.firmGstin || 'N/A'}`, 15, 8);
    doc.text(`Mob: ${filters.firmMobile || '9821728079, 9987559327'}`, pageWidth - 15, 8, { align: 'right' });

    // 2. Middle Row: Firm Name (Centered and Large)
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Bold Red
    doc.text(`${enterprise.toUpperCase()} ENTERPRISES`, pageWidth / 2, 21, { align: 'center' });
    
    // 3. First Red Line - Edge to Edge
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(0, 25, pageWidth, 25);

    // 4. Address Line (Normal Properties with Red Color)
    doc.setFontSize(7.5); 
    doc.setFont('helvetica', 'normal'); 
    doc.setTextColor(200, 0, 0); // Color RED
    // Reset spacing to zero to fix "P r a t i k" issue
    if ((doc as any).setCharSpace) {
        (doc as any).setCharSpace(0);
    }
    const addressStr = `Pratik Apartments, C - 101, Waitiwadi, Wagle Estate, Thane - 400 604.  . Email : vithal_enterprises@yahoo.in`;
    doc.text(addressStr, pageWidth / 2, 28.5, { align: 'center' });

    // 5. Second Red Line - Edge to Edge
    doc.line(0, 30.5, pageWidth, 30.5);

    // Reset character spacing for body
    if ((doc as any).setCharSpace) {
        (doc as any).setCharSpace(0);
    }

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
            currentY += 8;
        }
    }

    // --- Subject Line ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const subject = `Subject: ${filters.customSubject || 'Balance Confirmation Statement'}`.trim();
    doc.text(subject, pageWidth / 2, currentY, { align: 'center' });
    
    const subjWidth = doc.getTextWidth(subject);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line((pageWidth / 2) - (subjWidth / 2), currentY + 1, (pageWidth / 2) + (subjWidth / 2), currentY + 1);
    
    currentY += 12;

    // --- Salutation ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Dear Sir,', 15, currentY);
    currentY += 6;

    // --- Introduction Paragraph ---
    doc.setFont('helvetica', 'normal');
    const introText = filters.customDescription || `This is to inform you about the outstanding balance as per our records mentioned below:`;
    const introLines = doc.splitTextToSize(introText, pageWidth - 30);
    doc.text(introLines, 15, currentY);
    currentY += (introLines.length * 5) + 5;

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

    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
    const totalTds = invoices.reduce((sum, inv) => sum + inv.tdsAmount, 0);

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
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
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
            cellPadding: 1.5,
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
    let signY = finalY + 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Thanking You,', 15, signY);
    signY += 6;
    doc.text('Yours truly,', 15, signY);

    // Render Vithal Stamp if applicable - Wrapped in try/catch to avoid load errors
    if (enterprise.toLowerCase() === 'vithal') {
        try {
            const stampImg = await loadImage('/vithal-stamp.png');
            // Adding stamp on the right side of signature
            doc.addImage(stampImg, 'PNG', pageWidth - 70, signY - 5, 40, 40);
        } catch (e) {
            // Silently continue if stamp is missing
        }
    }

    signY += 6;
    doc.text(`For M/S ${enterprise.toUpperCase()} ENTERPRISES`, 15, signY);
    
    signY += 22; 
    doc.setFont('helvetica', 'bold');
    doc.text('TEJAS.R.MAVLANKAR', 15, signY);
    signY += 5;
    doc.setFontSize(9);
    doc.text('Mob: 9987559327', 15, signY);

    // --- Footer ---
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7.5);
    doc.text(`* This is a system-generated Balance Confirmation Letter. Generated on: ${format(new Date(), 'dd MMM yyyy, p')}`, pageWidth / 2, 285, { align: 'center' });

    const sanitizedCompanyName = filters.company && filters.company !== 'All' 
        ? filters.company.replace(/[^a-zA-Z0-9]/g, '_') 
        : 'Payment_Summary';
    
    const fileName = `Balance_Confirmation_${enterprise}_${sanitizedCompanyName}.pdf`;
    doc.save(fileName);
};