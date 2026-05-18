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
    includeStamp?: boolean;
    addressFontSize?: number;
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
    
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    const themeColor: [number, number, number] = [0, 0, 0]; // Standard black borders/lines
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const thinBorder = 0.1;

    // --- Main Document Border ---
    doc.setDrawColor(0);
    doc.setLineWidth(thinBorder);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    const topPadding = margin + 5;

    // --- Header Section ---
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(enterpriseTitle.toUpperCase(), pageWidth / 2, topPadding + 10, { align: 'center' });

    doc.setDrawColor(0); 
    doc.setLineWidth(thinBorder);
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

    // The line below the address block has been removed as per user request.

    let currentY = topPadding + 42;

    // --- Challan Info Line ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            `CHALLAN NO: ${data.challanNo.toUpperCase()}`,
            `VEHICLE NO: ${data.vehicleNo.toUpperCase()}`,
            `DATE: ${format(parseISO(data.date), 'dd-MMM-yyyy').toUpperCase()}`
        ]],
        theme: 'grid',
        styles: { 
            fontSize: 8.5, 
            cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
            halign: 'left',
            font: 'helvetica', 
            lineColor: [0, 0, 0], 
            lineWidth: thinBorder,
            fontStyle: 'bold',
            textColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- Addresses Labels Row (Lock 50/50 alignment) ---
    autoTable(doc, {
        startY: currentY,
        body: [['FROM :', 'DELIVERY TO :']],
        theme: 'grid',
        styles: {
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            lineColor: [0, 0, 0],
            lineWidth: thinBorder,
            textColor: [0, 0, 0],
        },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2 }, 
            1: { cellWidth: contentWidth / 2 } 
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- Address Content Section (Lock 50/50 alignment & Capital Text) ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            data.fromAddress.toUpperCase(),
            `${data.deliveryToName.toUpperCase()}\n${data.deliveryToAddress.toUpperCase()}`
        ]],
        theme: 'grid',
        bodyStyles: {
            minCellHeight: 30 
        },
        styles: { 
            fontSize: data.addressFontSize || 10, 
            cellPadding: 4, 
            font: 'helvetica', 
            overflow: 'linebreak', 
            lineColor: [0, 0, 0], 
            lineWidth: thinBorder, 
            valign: 'top',
        },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2 }, 
            1: { cellWidth: contentWidth / 2 } 
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    const footerAreaHeight = 35;
    const footerStartY = pageHeight - margin - footerAreaHeight;
    const tableAreaBottomY = footerStartY - 5;

    // --- Items Table ---
    const tableBody = data.items.map((item, index) => {
        const lines = item.particulars.split('\n');
        return [
            index + 1,
            item.particulars.toUpperCase(),
            item.amount > 0 ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['SR.', 'PARTICULARS', 'AMOUNT']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [245, 245, 245], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            halign: 'center', 
            lineWidth: thinBorder, 
            lineColor: [0, 0, 0] 
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 4, 
            font: 'helvetica', 
            lineColor: [0, 0, 0], 
            lineWidth: thinBorder, 
            minCellHeight: 10, 
            valign: 'top' 
        },
        bodyStyles: {
            lineWidth: { left: thinBorder, right: thinBorder, top: 0, bottom: 0 }
        },
        columnStyles: { 
            0: { cellWidth: 15, halign: 'center' }, 
            1: { cellWidth: contentWidth - 45 }, 
            2: { cellWidth: 30, halign: 'right' } 
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didParseCell: (data) => {
            // Apply underline to 'NOT FOR SALE' if it's the first line of particulars
            if (data.section === 'body' && data.column.index === 1) {
                const text = data.cell.text[0] || '';
                if (text.includes('NOT FOR SALE')) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        didDrawCell: (data) => {
            // Custom underline for 'NOT FOR SALE'
            if (data.section === 'body' && data.column.index === 1) {
                const text = data.cell.text[0] || '';
                if (text.includes('NOT FOR SALE')) {
                    const textWidth = doc.getTextWidth('NOT FOR SALE');
                    doc.setLineWidth(0.2);
                    doc.line(data.cell.x + 4, data.cell.y + 8, data.cell.x + 4 + textWidth, data.cell.y + 8);
                }
            }
        }
    });

    const tableFinalY = (doc as any).lastAutoTable.finalY;

    // Draw vertical lines to the signature area if table is short
    if (tableFinalY < tableAreaBottomY) {
        doc.setDrawColor(0);
        doc.setLineWidth(thinBorder);
        doc.line(margin, tableFinalY, margin, tableAreaBottomY);
        doc.line(margin + 15, tableFinalY, margin + 15, tableAreaBottomY);
        doc.line(pageWidth - margin - 30, tableFinalY, pageWidth - margin - 30, tableAreaBottomY);
        doc.line(pageWidth - margin, tableFinalY, pageWidth - margin, tableAreaBottomY);
        doc.line(margin, tableAreaBottomY, pageWidth - margin, tableAreaBottomY);
    } else {
        doc.setDrawColor(0);
        doc.setLineWidth(thinBorder);
        doc.line(margin, tableFinalY, pageWidth - margin, tableFinalY);
    }

    // --- 2cm Signature Row ---
    const enterpriseName = data.enterprise === 'RV' ? 'R.V.' : 'VITHAL';
    autoTable(doc, {
        startY: tableAreaBottomY,
        body: [[
            'RECEIVED BY',
            `FOR ${enterpriseName} ENTERPRISES`
        ]],
        theme: 'grid',
        styles: {
            fontSize: 10,
            fontStyle: 'bold',
            minCellHeight: 20, // 2cm row height
            valign: 'top',
            lineColor: [0, 0, 0],
            lineWidth: thinBorder,
            textColor: [0, 0, 0],
            cellPadding: { top: 4, left: 4, right: 4, bottom: 4 }
        },
        columnStyles: {
            0: { cellWidth: contentWidth / 2, halign: 'left' },
            1: { cellWidth: contentWidth / 2, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    const sigFinalY = (doc as any).lastAutoTable.finalY;

    if (data.includeStamp) {
        const stampFile = data.enterprise === 'RV' ? '/rv-stamp.png' : '/vithal-stamp.png';
        try {
            const stampImg = await loadImage(stampFile);
            doc.addImage(stampImg, 'PNG', pageWidth - margin - 50, sigFinalY - 26, 35, 35);
        } catch (e) {
            console.error("Stamp failed to load", e);
        }
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text("AUTHORISED SIGNATORY", pageWidth - margin - 4, sigFinalY - 4, { align: 'right' });

    const fileName = `Challan_${data.challanNo.replace(/[/\\?%*:|"<>]/g, '-')}_${data.enterprise}.pdf`;
    doc.save(fileName);
};