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
    // Customization Options
    fromAddressFontSize?: number;
    deliveryToAddressFontSize?: number;
    headerHeight?: number;
    footerHeight?: number;
    srWidth?: number;
    amountWidth?: number;
    titleFontSize?: number;
    particularsFontSize?: number;
    headerDetailsFontSize?: number;
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
    
    // Configurable Layout Constants
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const standardBorder = 0.3; // Increased from 0.1 for bolder look
    
    const headerBlockHeight = data.headerHeight || 20;
    const footerHeight = data.footerHeight || 20;
    const srWidth = data.srWidth || 15;
    const amountWidth = data.amountWidth || 30;
    const particularsWidth = contentWidth - srWidth - amountWidth;
    
    const footerStartY = pageHeight - margin - footerHeight;

    // --- Main External Frame ---
    doc.setDrawColor(0);
    doc.setLineWidth(standardBorder);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    // --- 1. Header: Firm Name (Centered in Block) ---
    const headerBlockY = margin;
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    // Vertical centering logic for firm name
    doc.text(enterpriseTitle.toUpperCase(), pageWidth / 2, headerBlockY + (headerBlockHeight / 2) + 3, { align: 'center' });

    // Header Block Bottom Separator (Full Width)
    doc.setLineWidth(standardBorder);
    doc.line(margin, headerBlockY + headerBlockHeight, pageWidth - margin, headerBlockY + headerBlockHeight);

    let currentY = headerBlockY + headerBlockHeight + 5;

    // --- 2. Subtitles & Tax Info ---
    const detailFS = data.headerDetailsFontSize || 8.5;
    doc.setFontSize(detailFS + 1.5);
    doc.setFont('helvetica', 'bold');
    doc.text("Supplier of Material Handling Equipments & Labour", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(detailFS);
    doc.setFont('helvetica', 'normal');
    doc.text("Off. : A/404, Astraea, Rustomjee Urbania, Near Lodha Paradise, Majiwada, Thane (W) - 400601.", pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;
    doc.text("Work : Sr No. 14/6A, Khot Banglow, Near Transformer, Bhandarli, Pimpri, Thane - 400 612.", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(`PAN: ${data.pan} | GSTIN: ${data.gstin}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Bolder line after header details
    doc.setLineWidth(standardBorder);
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
        
        doc.setLineWidth(standardBorder);
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
        styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 2.5, lineColor: 0, lineWidth: standardBorder, textColor: 0 },
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
        styles: { cellPadding: 3.5, font: 'helvetica', overflow: 'linebreak', lineColor: 0, lineWidth: standardBorder, valign: 'top', minCellHeight: 18 },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2, fontSize: data.fromAddressFontSize || 9.5 }, 
            1: { cellWidth: contentWidth / 2, fontSize: data.deliveryToAddressFontSize || 9.5 } 
        },
        margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // --- 5. Manual Header Row (Bolder Alignment) ---
    const headerRowHeight = 8;
    const headerStartY = currentY;
    
    // Header Background
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, headerStartY, contentWidth, headerRowHeight, 'F');
    
    // Header Frame Lines
    doc.setLineWidth(standardBorder);
    doc.setDrawColor(0);
    doc.line(margin, headerStartY, margin + contentWidth, headerStartY); // Top
    doc.line(margin, headerStartY + headerRowHeight, margin + contentWidth, headerStartY + headerRowHeight); // Bottom
    
    // Column Divider Markers in Header
    doc.line(margin + srWidth, headerStartY, margin + srWidth, headerStartY + headerRowHeight);
    doc.line(margin + contentWidth - amountWidth, headerStartY, margin + contentWidth - amountWidth, headerStartY + headerRowHeight);

    // Header Text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("SR.", margin + (srWidth / 2), headerStartY + 5.5, { align: 'center' });
    doc.text("PARTICULARS", margin + srWidth + (particularsWidth / 2), headerStartY + 5.5, { align: 'center' });
    doc.text("AMOUNT", margin + contentWidth - (amountWidth / 2), headerStartY + 5.5, { align: 'center' });

    currentY = headerStartY + headerRowHeight;
    const bodyStartY = currentY;
    
    // --- 6. Independent Title: "(NOT FOR SALE)" ---
    doc.setFontSize(data.titleFontSize || 10);
    doc.setFont('helvetica', 'bold');
    const titleText = "(NOT FOR SALE)";
    const titleX = margin + srWidth + (particularsWidth / 2);
    const titleY = bodyStartY + 8;
    doc.text(titleText, titleX, titleY, { align: 'center' });
    
    // Manual Underline
    const tw = doc.getTextWidth(titleText);
    doc.setLineWidth(0.3);
    doc.line(titleX - (tw / 2), titleY + 1, titleX + (tw / 2), titleY + 1);

    // --- 7. Manual Item Listing (No Horizontal Lines) ---
    let itemY = titleY + 10;
    doc.setFontSize(data.particularsFontSize || 9);
    doc.setFont('helvetica', 'normal');

    data.items.filter(i => i.particulars.trim()).forEach((item, index) => {
        doc.text((index + 1).toString(), margin + (srWidth / 2), itemY, { align: 'center' });
        
        const lines = doc.splitTextToSize(item.particulars.toUpperCase(), particularsWidth - 4);
        doc.text(lines, margin + srWidth + 2, itemY);
        
        if (item.amount) {
            doc.text(`${item.amount.toFixed(2)}/-`, margin + contentWidth - 2, itemY, { align: 'right' });
        }
        
        itemY += (lines.length * 4.5) + 3;
    });

    // --- 8. Persistent Bolder Vertical Dividers ---
    doc.setLineWidth(standardBorder);
    doc.setDrawColor(0);
    doc.line(margin + srWidth, headerStartY, margin + srWidth, footerStartY);
    doc.line(margin + contentWidth - amountWidth, headerStartY, margin + contentWidth - amountWidth, footerStartY);

    // --- 9. Fixed Signature Footer ---
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
            lineWidth: standardBorder,
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