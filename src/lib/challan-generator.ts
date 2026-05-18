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
    fromName: string;
    fromAddress: string;
    deliveryToName: string;
    deliveryToAddress: string;
    items: ChallanItem[];
    pan: string;
    gstin: string;
    includeStamp?: boolean;
    fromAddressFontSize?: number;
    deliveryToAddressFontSize?: number;
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
    
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const thinBorder = 0.1;
    const footerHeight = 20; // Exactly 2cm
    const footerStartY = pageHeight - margin - footerHeight;

    // --- Main External Frame ---
    doc.setDrawColor(0);
    doc.setLineWidth(thinBorder);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    let currentY = margin + 5;

    // --- Header Section ---
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.text(enterpriseTitle.toUpperCase(), pageWidth / 2, currentY + 10, { align: 'center' });

    // Professional separator line under firm name
    doc.setLineWidth(0.3);
    doc.line(margin + 5, currentY + 13, pageWidth - margin - 5, currentY + 13);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Supplier of Material Handling Equipments & Labour", pageWidth / 2, currentY + 19, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("Off. : A/404, Astraea, Rustomjee Urbania, Near Lodha Paradise, Majiwada, Thane (W) - 400601.", pageWidth / 2, currentY + 24, { align: 'center' });
    doc.text("Work : Sr No. 14/6A, Khot Banglow, Near Transformer, Bhandarli, Pimpri, Thane - 400 612.", pageWidth / 2, currentY + 29, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`PAN: ${data.pan} | GSTIN: ${data.gstin}`, pageWidth / 2, currentY + 35, { align: 'center' });

    currentY += 40;

    // --- Info Row (3 Columns) ---
    const drawInfoCell = (title: string, value: string, x: number, width: number) => {
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'normal');
        doc.text(title, x + 2, currentY + 5.2);
        
        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(11); 
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 2 + titleWidth + 2, currentY + 5.5);
        
        doc.setLineWidth(thinBorder);
        doc.rect(x, currentY, width, 8);
    };

    const colW = contentWidth / 3;
    drawInfoCell("CHALLAN NO:", data.challanNo.toUpperCase(), margin, colW);
    drawInfoCell("VEHICLE NO:", data.vehicleNo.toUpperCase(), margin + colW, colW);
    drawInfoCell("DATE:", format(parseISO(data.date), 'dd-MMM-yyyy').toUpperCase(), margin + (colW * 2), colW);

    currentY += 8;

    // --- Address Headers (50/50 Split) ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            `FROM :  ${data.fromName.toUpperCase()}`,
            `DELIVERY TO :  ${data.deliveryToName.toUpperCase()}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 3, lineColor: 0, lineWidth: thinBorder, textColor: 0 },
        columnStyles: { 0: { cellWidth: contentWidth / 2 }, 1: { cellWidth: contentWidth / 2 } },
        margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- Address Content (UPPERCASE) ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            data.fromAddress.toUpperCase(),
            data.deliveryToAddress.toUpperCase()
        ]],
        theme: 'grid',
        styles: { cellPadding: 4, font: 'helvetica', overflow: 'linebreak', lineColor: 0, lineWidth: thinBorder, valign: 'top', minCellHeight: 20 },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2, fontSize: data.fromAddressFontSize || 10 }, 
            1: { cellWidth: contentWidth / 2, fontSize: data.deliveryToAddressFontSize || 10 } 
        },
        margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- Blank Framed Particulars Area ---
    // Drawing a blank frame that fills the space between Address Section and Signature Row
    doc.setLineWidth(thinBorder);
    doc.setDrawColor(0);
    
    // Draw horizontal table headers
    autoTable(doc, {
        startY: currentY,
        head: [['SR.', 'PARTICULARS', 'AMOUNT']],
        body: [], // BLANK AREA AS REQUESTED
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, lineColor: 0, lineWidth: thinBorder, font: 'helvetica' },
        headStyles: { fillColor: 240, textColor: 0, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: contentWidth - 45 },
            2: { cellWidth: 30 }
        },
        margin: { left: margin, right: margin }
    });

    const tableHeaderY = (doc as any).lastAutoTable.finalY;
    
    // Manually draw vertical lines from table header to absolute footer start
    doc.line(margin, tableHeaderY, margin, footerStartY); // Left Border
    doc.line(margin + 15, tableHeaderY, margin + 15, footerStartY); // SR Column Divider
    doc.line(pageWidth - margin - 30, tableHeaderY, pageWidth - margin - 30, footerStartY); // Amount Column Divider
    doc.line(pageWidth - margin, tableHeaderY, pageWidth - margin, footerStartY); // Right Border
    doc.line(margin, footerStartY, pageWidth - margin, footerStartY); // Closing line for particulars section

    // --- Integrated Signature Row (Fixed to absolute bottom of page 1) ---
    autoTable(doc, {
        startY: footerStartY,
        body: [[
            'RECEIVED BY',
            `FOR ${data.enterprise === 'RV' ? 'R.V.' : 'VITHAL'} ENTERPRISES`
        ]],
        theme: 'grid',
        styles: {
            fontSize: 10,
            fontStyle: 'bold',
            minCellHeight: footerHeight,
            valign: 'top',
            lineColor: 0,
            lineWidth: thinBorder,
            textColor: 0,
            cellPadding: 4
        },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.7, halign: 'left' },
            1: { cellWidth: contentWidth * 0.3, halign: 'right' }
        },
        margin: { left: margin, right: margin, bottom: margin }, // CRITICAL: explicit margins to prevent page break
        didDrawCell: (hook) => {
            // Place small "Signature" label inside the right cell
            if (hook.section === 'body' && hook.column.index === 1) {
                const cell = hook.cell;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                // Absolute positioning within the cell at the bottom-right
                doc.text("Signature", cell.x + cell.width - 4, cell.y + cell.height - 3, { align: 'right' });
            }
        }
    });

    // Optional Stamp
    if (data.includeStamp) {
        const stampFile = data.enterprise === 'RV' ? '/rv-stamp.png' : '/vithal-stamp.png';
        try {
            const stampImg = await loadImage(stampFile);
            // Place stamp floating over signature area
            doc.addImage(stampImg, 'PNG', pageWidth - margin - 35, footerStartY - 5, 30, 30);
        } catch (e) { }
    }

    doc.save(`Challan_${data.challanNo.replace(/\//g, '-')}.pdf`);
};