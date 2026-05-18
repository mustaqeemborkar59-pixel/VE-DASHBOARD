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
    const footerHeight = 20; // 2cm
    const footerStartY = pageHeight - margin - footerHeight;

    // --- Main External Frame ---
    doc.setDrawColor(0);
    doc.setLineWidth(thinBorder);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    // --- 1. Firm Name Header (Exactly 2cm Height, Centered) ---
    const headerHeight = 20; // 2cm
    const headerY = margin;
    
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
    
    // Background Frame for header (optional, keeping it clean)
    doc.setLineWidth(thinBorder);
    
    // Centering Text vertically and horizontally in the 2cm block
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.text(enterpriseTitle.toUpperCase(), pageWidth / 2, headerY + (headerHeight / 2) + 3, { align: 'center' });

    // Full-width Bottom Border for Header (Sata huwa from left to right)
    doc.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight);

    let currentY = headerY + headerHeight + 5;

    // --- 2. Subtitles & Tax Info ---
    doc.setFontSize(10.5);
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
    currentY += 5;

    // Line after header block
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // --- 3. Info Row (CHALLAN / VEHICLE / DATE) ---
    const drawInfoCell = (title: string, value: string, x: number, width: number, y: number) => {
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'normal');
        doc.text(title, x + 2, y + 5.2);
        
        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(10); 
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

    // --- 4. Address Section (50/50 Split) ---
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

    // --- 5. Particulars Area (Fixed Width Alignment) ---
    const srWidth = 15;
    const amountWidth = 30;
    const particularsWidth = contentWidth - srWidth - amountWidth;

    // Filter items to ensure we only render what user has entered
    const validItems = data.items.filter(item => item.particulars.trim() !== '');

    autoTable(doc, {
        startY: currentY,
        head: [['SR.', 'PARTICULARS', 'AMOUNT']],
        body: validItems.map((item, index) => [
            (index + 1).toString(),
            item.particulars.toUpperCase(),
            item.amount ? `${item.amount.toFixed(2)}/-` : ''
        ]),
        theme: 'grid',
        tableWidth: contentWidth,
        styles: { 
            fontSize: 9, 
            cellPadding: 3, 
            lineColor: 0, 
            lineWidth: thinBorder, 
            font: 'helvetica',
            textColor: 0,
            overflow: 'linebreak'
        },
        headStyles: { fillColor: 240, textColor: 0, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: srWidth, halign: 'center' },
            1: { cellWidth: particularsWidth },
            2: { cellWidth: amountWidth, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    const tableFinalY = (doc as any).lastAutoTable.finalY;
    
    // Draw manual vertical lines to match header exactly and stretch to footer
    doc.setLineWidth(thinBorder);
    doc.setDrawColor(0);
    
    // Left boundary
    doc.line(margin, tableFinalY, margin, footerStartY);
    // SR Divider
    doc.line(margin + srWidth, tableFinalY, margin + srWidth, footerStartY);
    // AMOUNT Divider
    doc.line(margin + srWidth + particularsWidth, tableFinalY, margin + srWidth + particularsWidth, footerStartY);
    // Right boundary
    doc.line(pageWidth - margin, tableFinalY, pageWidth - margin, footerStartY);
    
    // Bottom boundary line before signature
    doc.line(margin, footerStartY, pageWidth - margin, footerStartY);

    // --- 6. Integrated Signature Row (Fixed 2cm at absolute bottom) ---
    autoTable(doc, {
        startY: footerStartY,
        body: [[
            'RECEIVED BY',
            `FOR ${data.enterprise === 'RV' ? 'R.V.' : 'VITHAL'} ENTERPRISES`
        ]],
        theme: 'grid',
        tableWidth: contentWidth,
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
        margin: { left: margin, right: margin, bottom: margin },
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