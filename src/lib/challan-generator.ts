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
    const footerHeight = 20; 
    const footerStartY = pageHeight - margin - footerHeight;

    // --- Main External Frame ---
    doc.setDrawColor(0);
    doc.setLineWidth(thinBorder);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    // --- 1. Header: Firm Name (Exactly 2cm Height, Centered) ---
    const headerBlockHeight = 20; 
    const headerBlockY = margin;
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.text(enterpriseTitle.toUpperCase(), pageWidth / 2, headerBlockY + 13, { align: 'center' });

    // Header Separator Line
    doc.setLineWidth(thinBorder);
    doc.line(margin, headerBlockY + headerBlockHeight, pageWidth - margin, headerBlockY + headerBlockHeight);

    let currentY = headerBlockY + headerBlockHeight + 5;

    // --- 2. Subtitles & Tax Info ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Supplier of Material Handling Equipments & Labour", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text("Off. : A/404, Astraea, Rustomjee Urbania, Near Lodha Paradise, Majiwada, Thane (W) - 400601.", pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;
    doc.text("Work : Sr No. 14/6A, Khot Banglow, Near Transformer, Bhandarli, Pimpri, Thane - 400 612.", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(`PAN: ${data.pan} | GSTIN: ${data.gstin}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Line after header details
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // --- 3. Info Row (CHALLAN / VEHICLE / DATE) ---
    const drawInfoCell = (title: string, value: string, x: number, width: number, y: number) => {
        doc.setFontSize(8); 
        doc.setFont('helvetica', 'normal');
        doc.text(title, x + 2, y + 5.2);
        
        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(10.5); 
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 2 + titleWidth + 2, y + 5.5);
        
        doc.setLineWidth(thinBorder);
        doc.rect(x, y, width, 8);
    };

    const colW = contentWidth / 3;
    drawInfoCell("CHALLAN NO:", data.challanNo.toUpperCase(), margin, colW, currentY);
    drawInfoCell("VEHICLE NO:", data.vehicleNo.toUpperCase(), margin + colW, colW, currentY);
    drawInfoCell("DATE:", format(parseISO(data.date), 'dd-MMM-yyyy').toUpperCase(), margin + (colW * 2), colW, currentY);

    currentY += 8;

    // --- 4. Address Section ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            `FROM :  ${data.fromName.toUpperCase()}`,
            `DELIVERY TO :  ${data.deliveryToName.toUpperCase()}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 2.5, lineColor: 0, lineWidth: thinBorder, textColor: 0 },
        columnStyles: { 0: { cellWidth: contentWidth / 2 }, 1: { cellWidth: contentWidth / 2 } },
        margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
        startY: currentY,
        body: [[
            data.fromAddress.toUpperCase(),
            data.deliveryToAddress.toUpperCase()
        ]],
        theme: 'grid',
        styles: { cellPadding: 3.5, font: 'helvetica', overflow: 'linebreak', lineColor: 0, lineWidth: thinBorder, valign: 'top', minCellHeight: 18 },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2, fontSize: data.fromAddressFontSize || 9.5 }, 
            1: { cellWidth: contentWidth / 2, fontSize: data.deliveryToAddressFontSize || 9.5 } 
        },
        margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- 5. Particulars Table (FIXED COLUMN WIDTHS) ---
    const srWidth = 15;
    const amountWidth = 30;
    const particularsWidth = contentWidth - srWidth - amountWidth;

    // Drawing Header with EXACT widths to prevent misalignment
    autoTable(doc, {
        startY: currentY,
        head: [['SR.', 'PARTICULARS', 'AMOUNT']],
        theme: 'grid',
        tableWidth: contentWidth,
        styles: { 
            fontSize: 9, 
            cellPadding: 3, 
            lineColor: 0, 
            lineWidth: thinBorder, 
            font: 'helvetica',
            textColor: 0,
            halign: 'center'
        },
        headStyles: { fillColor: 245, textColor: 0, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: srWidth },
            1: { cellWidth: particularsWidth, halign: 'center' },
            2: { cellWidth: amountWidth }
        },
        margin: { left: margin, right: margin },
    });

    const bodyStartY = (doc as any).lastAutoTable.finalY;
    
    // --- 6. Manual Independent Title: "(NOT FOR SALE)" ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleText = "(NOT FOR SALE)";
    const titleX = margin + srWidth + (particularsWidth / 2);
    const titleY = bodyStartY + 8;
    doc.text(titleText, titleX, titleY, { align: 'center' });
    
    // Manual Underline
    const tw = doc.getTextWidth(titleText);
    doc.setLineWidth(0.2);
    doc.line(titleX - (tw / 2), titleY + 1, titleX + (tw / 2), titleY + 1);

    // --- 7. Render Items Manually (No horizontal lines) ---
    let itemY = titleY + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    data.items.filter(i => i.particulars.trim()).forEach((item, index) => {
        // SR No
        doc.text((index + 1).toString(), margin + (srWidth / 2), itemY, { align: 'center' });
        
        // Particulars (supports multi-line)
        const lines = doc.splitTextToSize(item.particulars.toUpperCase(), particularsWidth - 4);
        doc.text(lines, margin + srWidth + 2, itemY);
        
        // Amount
        if (item.amount) {
            doc.text(`${item.amount.toFixed(2)}/-`, margin + srWidth + particularsWidth + amountWidth - 2, itemY, { align: 'right' });
        }
        
        // Calculate next Y based on line length
        itemY += (lines.length * 4.5) + 3;
    });

    // --- 8. Vertical Dividers (Header Bottom to Footer Start) ---
    doc.setLineWidth(thinBorder);
    doc.setDrawColor(0);
    // Vertical Line 1: SR Divider (at x = margin + srWidth)
    doc.line(margin + srWidth, bodyStartY, margin + srWidth, footerStartY);
    // Vertical Line 2: Amount Divider (at x = margin + srWidth + particularsWidth)
    doc.line(margin + srWidth + particularsWidth, bodyStartY, margin + srWidth + particularsWidth, footerStartY);

    // --- 9. Fixed 2cm Signature Row ---
    autoTable(doc, {
        startY: footerStartY,
        body: [[
            'RECEIVED BY',
            `FOR ${data.enterprise === 'RV' ? 'R.V.' : 'VITHAL'} ENTERPRISES`
        ]],
        theme: 'grid',
        tableWidth: contentWidth,
        margin: { left: margin, right: margin, bottom: margin },
        styles: {
            fontSize: 9.5,
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
        didDrawCell: (hook) => {
            if (hook.section === 'body' && hook.column.index === 1) {
                const cell = hook.cell;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text("Signature", cell.x + cell.width - 4, cell.y + cell.height - 3, { align: 'right' });
            }
        }
    });

    // Optional Stamp
    if (data.includeStamp) {
        const stampFile = data.enterprise === 'RV' ? '/rv-stamp.png' : '/vithal-stamp.png';
        try {
            const stampImg = await loadImage(stampFile);
            doc.addImage(stampImg, 'PNG', pageWidth - margin - 35, footerStartY - 5, 30, 30);
        } catch (e) { }
    }

    doc.save(`Challan_${data.challanNo.replace(/\//g, '-')}.pdf`);
};
