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
    
    const enterpriseTitle = data.enterprise === 'RV' ? 'R.V. ENTERPRISES' : 'VITHAL ENTERPRISES';
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

    // Solid Line below Firm Name
    doc.setDrawColor(0); 
    doc.setLineWidth(0.3);
    doc.line(margin + 5, topPadding + 13, pageWidth - margin - 5, topPadding + 13);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Supplier of Material Handling Equipments & Labour", pageWidth / 2, topPadding + 19, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const offAddr = "Off. : A/404, Astraea, Rustomjee Urbania, Near Lodha Paradise, Majiwada, Thane (W) - 400601.";
    const workAddr = "Work : Sr No. 14/6A, Khot Banglow, Near Transformer, Bhandarli, Pimpri, Thane - 400 612.";
    doc.text(offAddr, pageWidth / 2, topPadding + 24, { align: 'center' });
    doc.text(workAddr, pageWidth / 2, topPadding + 29, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`PAN: ${data.pan} | GSTIN: ${data.gstin}`, pageWidth / 2, topPadding + 35, { align: 'center' });

    let currentY = topPadding + 40;

    // --- Challan Info Row ---
    const drawInfoCell = (title: string, value: string, x: number, width: number) => {
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'normal');
        doc.text(title, x + 2, currentY + 5);
        
        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(11); 
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 2 + titleWidth + 2, currentY + 5.2);
        
        doc.setLineWidth(thinBorder);
        doc.rect(x, currentY, width, 8);
    };

    const colW = contentWidth / 3;
    drawInfoCell("CHALLAN NO:", data.challanNo.toUpperCase(), margin, colW);
    drawInfoCell("VEHICLE NO:", data.vehicleNo.toUpperCase(), margin + colW, colW);
    drawInfoCell("DATE:", format(parseISO(data.date), 'dd-MMM-yyyy').toUpperCase(), margin + (colW * 2), colW);

    currentY += 8;

    // --- Addresses Labels Row ---
    autoTable(doc, {
        startY: currentY,
        body: [
            [
                { content: `FROM :  ${data.fromName.toUpperCase()}`, styles: { halign: 'left' } },
                { content: `DELIVERY TO :  ${data.deliveryToName.toUpperCase()}`, styles: { halign: 'left' } }
            ]
        ],
        theme: 'grid',
        styles: {
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
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

    // --- Address Content section (Uppercase) ---
    autoTable(doc, {
        startY: currentY,
        body: [[
            data.fromAddress.toUpperCase(),
            data.deliveryToAddress.toUpperCase()
        ]],
        theme: 'grid',
        styles: { 
            cellPadding: 4, 
            font: 'helvetica', 
            overflow: 'linebreak', 
            lineColor: [0, 0, 0], 
            lineWidth: thinBorder, 
            valign: 'top',
            minCellHeight: 25
        },
        columnStyles: { 
            0: { cellWidth: contentWidth / 2, fontSize: data.fromAddressFontSize || 10 }, 
            1: { cellWidth: contentWidth / 2, fontSize: data.deliveryToAddressFontSize || 10 } 
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // MATHEMATICS FOR 1-PAGE LAYOUT LOCK
    const footerHeight = 20; // 2cm height
    const footerStartY = pageHeight - margin - footerHeight;

    // --- Items Table ---
    const tableBody = data.items.map((item, index) => [
        index + 1,
        item.particulars.toUpperCase(),
        item.amount > 0 ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'
    ]);

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
        tableWidth: contentWidth
    });

    const tableFinalY = (doc as any).lastAutoTable.finalY;

    // Stretch table lines to meet the footer
    if (tableFinalY < footerStartY) {
        doc.setDrawColor(0);
        doc.setLineWidth(thinBorder);
        doc.line(margin, tableFinalY, margin, footerStartY);
        doc.line(margin + 15, tableFinalY, margin + 15, footerStartY);
        doc.line(pageWidth - margin - 30, tableFinalY, pageWidth - margin - 30, footerStartY);
        doc.line(pageWidth - margin, tableFinalY, pageWidth - margin, footerStartY);
        doc.line(margin, footerStartY, pageWidth - margin, footerStartY);
    }

    // --- Fixed 2cm Signature Row (70/30 Area Split) ---
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
            minCellHeight: footerHeight, // 20mm height
            valign: 'top',
            lineColor: [0, 0, 0],
            lineWidth: thinBorder,
            textColor: [0, 0, 0],
            cellPadding: 4
        },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.7, halign: 'left' },
            1: { cellWidth: contentWidth * 0.3, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        didDrawCell: (hook) => {
            // Draw small "Signature" label at bottom-right corner of right cell
            if (hook.section === 'body' && hook.column.index === 1) {
                const cell = hook.cell;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text("Signature", cell.x + cell.width - 4, cell.y + cell.height - 4, { align: 'right' });
            }
        }
    });

    // Optional Stamp
    if (data.includeStamp) {
        const stampFile = data.enterprise === 'RV' ? '/rv-stamp.png' : '/vithal-stamp.png';
        try {
            const stampImg = await loadImage(stampFile);
            const stampSize = 30;
            doc.addImage(stampImg, 'PNG', pageWidth - margin - 35, pageHeight - margin - footerHeight - 5, stampSize, stampSize);
        } catch (e) { }
    }

    const fileName = `Challan_${data.challanNo.replace(/[/\\?%*:|"<>]/g, '-')}_${data.enterprise}.pdf`;
    doc.save(fileName);
};
