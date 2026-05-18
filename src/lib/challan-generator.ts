'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

export type ChallanItem = {
    particulars: string;
    amount: number;
};

export type ChallanData = {
    enterprise: 'Vithal' | 'RV';
    challanNo: string;
    vehicleNo: string;
    date: string;
    fromAddress: string;
    deliveryToName: string;
    deliveryToAddress: string;
    items: ChallanItem[];
    pan: string;
    gstin: string;
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
        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

export const generateChallanPdf = async (data: ChallanData) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const themeColor: [number, number, number] = data.enterprise === 'RV' ? [0, 51, 102] : [200, 0, 0];
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // --- Main Document Border ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    const topPadding = margin + 5;

    // --- Header Section ---
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    const firmName = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    doc.text(firmName, pageWidth / 2, topPadding + 10, { align: 'center' });

    doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 5, topPadding + 14, pageWidth - margin - 5, topPadding + 14);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Supplier of Material Handling Equipments & Labour", pageWidth / 2, topPadding + 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const offAddr = "Off. : A/404, Astraea, Rustomjee Urbania, Near Lodha Paradise, Majiwada, Thane (W) - 400601.";
    const workAddr = "Work : Sr No. 14/6A, Khot Banglow, Near Transformer, Bhandarli, Pimpri, Thane - 400 612.";
    doc.text(offAddr, pageWidth / 2, topPadding + 25, { align: 'center' });
    doc.text(workAddr, pageWidth / 2, topPadding + 30, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`PAN: ${data.pan} | GSTIN: ${data.gstin}`, pageWidth / 2, topPadding + 36, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(margin + 5, topPadding + 40, pageWidth - margin - 5, topPadding + 40);

    let currentY = topPadding + 45;

    // --- Challan Info Line ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            `Challan No: ${data.challanNo}`,
            `Vehicle No: ${data.vehicleNo}`,
            `Date: ${format(parseISO(data.date), 'dd-MMM-yyyy')}`
        ]],
        theme: 'grid',
        styles: { 
            fontSize: 9, 
            cellPadding: 3, 
            halign: 'left',
            font: 'helvetica', 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1,
            fontStyle: 'bold',
            textColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- Addresses Section ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            `From :\n${data.fromAddress}`,
            `Delivery To :\n${data.deliveryToName}\n${data.deliveryToAddress}`
        ]],
        theme: 'grid',
        styles: { 
            fontSize: 9, 
            cellPadding: 4, 
            font: 'helvetica', 
            overflow: 'linebreak', 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1,
            valign: 'top'
        },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2 }, 
            1: { cellWidth: contentWidth / 2 } 
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // Fixed Table Bottom Y to ensure columns go all the way down
    const footerStartY = pageHeight - margin - 45;
    const tableAreaBottomY = footerStartY - 10;

    // --- Items Table ---
    const tableBody = data.items.map((item, index) => [
        index + 1,
        item.particulars,
        item.amount > 0 ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Sr.', 'Particulars', 'Amount']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0] },
        styles: { 
            fontSize: 10, 
            cellPadding: 4, 
            font: 'helvetica', 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1, 
            minCellHeight: 10, 
            valign: 'top' 
        },
        bodyStyles: {
            lineWidth: { left: 0.1, right: 0.1, top: 0, bottom: 0 }
        },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: contentWidth - 45 }, 2: { cellWidth: 30, halign: 'right' } },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (data) => {
            // No specific logic needed here as we will draw vertical lines manually
        }
    });

    const tableFinalY = (doc as any).lastAutoTable.finalY;

    // Draw Vertical Lines down to the bottom of the table area
    if (tableFinalY < tableAreaBottomY) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        
        // Left Edge
        doc.line(margin, tableFinalY, margin, tableAreaBottomY);
        // Column 1 border
        doc.line(margin + 15, tableFinalY, margin + 15, tableAreaBottomY);
        // Column 2 border
        doc.line(pageWidth - margin - 30, tableFinalY, pageWidth - margin - 30, tableAreaBottomY);
        // Right Edge
        doc.line(pageWidth - margin, tableFinalY, pageWidth - margin, tableAreaBottomY);
        
        // Bottom closing line
        doc.line(margin, tableAreaBottomY, pageWidth - margin, tableAreaBottomY);
    } else {
        // If table naturally ends below the area, just close it
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.line(margin, tableFinalY, pageWidth - margin, tableFinalY);
    }

    // --- Footer / Signatures ---
    const footerY = footerStartY;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("Received By", margin + 10, footerY);
    
    const enterpriseName = data.enterprise === 'RV' ? 'R.V.' : 'VITHAL';
    doc.text(`For ${enterpriseName} ENTERPRISES`, pageWidth - margin - 10, footerY, { align: 'right' });

    doc.setFontSize(9.5);
    doc.text("Authorised Signatory", pageWidth - margin - 10, footerY + 28, { align: 'right' });

    // --- Stamp Positioning ---
    // User wants stamp in right corner ABOVE the row
    const stampFile = data.enterprise === 'RV' ? '/rv-stamp.png' : '/vithal-stamp.png';
    try {
        const stampImg = await loadImage(stampFile);
        // Position stamp above the "For..." line in the right section
        doc.addImage(stampImg, 'PNG', pageWidth - margin - 55, footerY - 45, 45, 45);
    } catch (e) {}

    const fileName = `Challan_${data.challanNo.replace(/[/\\?%*:|"<>]/g, '-')}_${data.enterprise}.pdf`;
    doc.save(fileName);
};