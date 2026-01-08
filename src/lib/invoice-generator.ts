

import { Packer, Document, Paragraph, TextRun, AlignmentType, BorderStyle, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, VerticalAlign, PageOrientation, IPageSize, PageSize } from 'docx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import type { Invoice, Company, InvoiceTemplate, InvoiceItem, CompanySettings } from './data';

export type PageSettings = {
    size: 'A4' | 'LETTER' | 'LEGAL',
    orientation: 'portrait' | 'landscape',
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    },
    addressFontSize?: number,
    tableBodyFontSize?: number,
}

const getPageSize = (size: PageSettings['size']): IPageSize => {
    switch (size) {
        case 'A4':
            return PageSize.A4;
        case 'LETTER':
            return PageSize.LETTER;
        case 'LEGAL':
            return PageSize.LEGAL;
        default:
            return PageSize.A4;
    }
}

// Function to convert cm to Twips (1 cm = 567 Twips)
const convertCmToTwip = (cm: number): number => {
    return cm * 567;
}


const generateInvoiceDataForWord = (invoice: Invoice, clientCompany: Company, myCompanyDetails: CompanySettings, template?: InvoiceTemplate) => {
    const words = new ToWords({
      localeCode: 'en-IN',
      converterOptions: {
        currency: true,
        ignoreDecimal: true,
        ignoreZeroCurrency: false,
      }
    });
    const grandTotalInWords = words.convert(invoice.grandTotal);
    
    return {
        to: {
          name: clientCompany.name.toUpperCase(),
          address: clientCompany.address.toUpperCase(),
          gstin: clientCompany.gstin || '',
          bankName: clientCompany.bankName || '',
          accountNumber: clientCompany.accountNumber || '',
          ifscCode: clientCompany.ifscCode || '',
          bankBranch: clientCompany.bankBranch || '',
        },
        myCompany: myCompanyDetails,
        billDate: format(parseISO(invoice.billDate), 'dd/MM/yyyy'),
        billNo: `${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}`.toUpperCase(),
        poNo: (invoice.poNumber || 'AGREEMENT').toUpperCase(),
        month: format(parseISO(invoice.billDate), 'MMM yyyy').toUpperCase(),
        site: (invoice.site || '').toUpperCase(),
        items: invoice.items,
        columns: template?.columns || [
            { id: 'particulars' as keyof InvoiceItem, label: 'Particulars', width: 66, align: 'left' as const, order: 1 },
            { id: 'rate' as keyof InvoiceItem, label: 'Rate', width: 12, align: 'right' as const, order: 2 },
            { id: 'amount' as keyof InvoiceItem, label: 'Amount', width: 12, align: 'right' as const, order: 3 },
        ],
        netTotal: invoice.netTotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        grandTotal: invoice.grandTotal,
        amountInWords: grandTotalInWords,
    }
}

const createFormattedTextRuns = (text: string | number | undefined, sizeInPoints: number = 11): TextRun[] => {
    if (text === undefined || text === null) return [new TextRun({text: "", font: "Calibri"})];
    
    const size = sizeInPoints * 2; // docx library uses half-points
    const textAsString = String(text);
    const lines = textAsString.split('\n');

    return lines.flatMap((line, lineIndex) => {
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(part => part); // Split by bold markdown
        const textRuns = parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({ text: part.slice(2, -2), bold: true, size, font: "Calibri" });
            }
            return new TextRun({ text: part, size, font: "Calibri" });
        });

        if (lineIndex < lines.length - 1) {
            textRuns.push(new TextRun({ break: 1, size, font: "Calibri" }));
        }

        return textRuns;
    });
};


export const generateAndDownloadInvoice = async (invoice: Invoice, clientCompany: Company, myCompanyDetails: CompanySettings, pageSettings?: PageSettings, template?: InvoiceTemplate) => {
    const settings: PageSettings = pageSettings || { 
        size: 'A4', 
        orientation: 'portrait', 
        margin: {top: 1.27, right: 1.27, bottom: 1.27, left: 1.27},
        addressFontSize: 10,
        tableBodyFontSize: 11
    };
    const invoiceData = generateInvoiceDataForWord(invoice, clientCompany, myCompanyDetails, template);
    const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const sortedColumns = [...invoiceData.columns].sort((a, b) => a.order - b.order);

    const tableHeaderBorders = {
        top: { style: BorderStyle.SINGLE },
        bottom: { style: BorderStyle.SINGLE },
        left: { style: BorderStyle.SINGLE },
        right: { style: BorderStyle.SINGLE }
    };
    
    const tableCellBorders = {
        left: { style: BorderStyle.SINGLE },
        right: { style: BorderStyle.SINGLE }
    };
    
    const tableBottomBorder = { bottom: { style: BorderStyle.SINGLE }};
    
    const cellMargins = { top: 50, bottom: 50, left: 100, right: 100 };

    const headerCells = [
        new DocxTableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Sr. No", bold: true, size: 24, font: "Calibri" })], alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
            borders: tableHeaderBorders,
            margins: cellMargins
        }),
        ...sortedColumns.map(column => new DocxTableCell({
            width: { size: column.id === 'particulars' ? 66 : 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
                children: [new TextRun({ text: column.label, bold: true, size: 24, font: "Calibri" })], 
                alignment: (column.label === 'Rate' || column.label === 'Amount') ? AlignmentType.CENTER : (column.align === 'right' ? AlignmentType.RIGHT : column.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT)
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: tableHeaderBorders,
            margins: cellMargins
        }))
    ];
    
    const createTotalRow = (label: string, value: string) => {
        const totalRowsBorders = {
            top: { style: BorderStyle.SINGLE },
            bottom: { style: BorderStyle.SINGLE },
            left: { style: BorderStyle.SINGLE },
            right: { style: BorderStyle.SINGLE },
        };
        const tableBodyFontSize = (settings.tableBodyFontSize || 12) * 2;

        const cells = [
             new DocxTableCell({
                columnSpan: 2,
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: tableBodyFontSize, font: "Calibri" })], alignment: AlignmentType.RIGHT })],
                verticalAlign: VerticalAlign.CENTER,
                borders: { ...totalRowsBorders, right: {style: BorderStyle.NONE}  },
                margins: cellMargins,
            }),
            new DocxTableCell({
                children: [new Paragraph({children: [new TextRun({text: '', font: "Calibri"})]})],
                borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE}  },
                margins: cellMargins,
                verticalAlign: VerticalAlign.CENTER,
            }),
            new DocxTableCell({
                children: [new Paragraph({ children: [new TextRun({ text: value, bold: true, size: tableBodyFontSize, font: "Calibri" })], alignment: AlignmentType.RIGHT })],
                verticalAlign: VerticalAlign.CENTER,
                borders: { ...totalRowsBorders, left: {style: BorderStyle.NONE}  },
                margins: cellMargins,
            }),
        ];

        return new DocxTableRow({ children: cells });
    }

    const doc = new Document({
        styles: {
            paragraphStyles: [{
                id: "default",
                name: "default",
                run: { font: "Calibri", size: 22 }, 
                paragraph: { spacing: { after: 0, before: 0, line: 276 } }
            }],
        },
        sections: [{
            properties: {
                page: {
                    size: getPageSize(settings.size),
                    orientation: settings.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
                    margin: { 
                        top: convertCmToTwip(settings.margin.top), 
                        right: convertCmToTwip(settings.margin.right), 
                        bottom: convertCmToTwip(settings.margin.bottom), 
                        left: convertCmToTwip(settings.margin.left) 
                    },
                },
            },
            children: [
                new Paragraph({
                    children: [new TextRun({ text: "INVOICE", bold: true, size: 28, font: "Calibri" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 }
                }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
                    rows: [
                       new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({text: "To,", font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true, font: "Calibri" })] }),
                                        new Paragraph({ children: createFormattedTextRuns(invoiceData.to.address, settings.addressFontSize) }),
                                    ],
                                    margins: cellMargins,
                                    verticalAlign: VerticalAlign.CENTER
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: `Bill Date: ${invoiceData.billDate}`, font: "Calibri" })], alignment: AlignmentType.RIGHT }),
                                    ],
                                    verticalAlign: VerticalAlign.TOP,
                                    margins: cellMargins,
                                }),
                            ],
                        }),
                    ]
                }),
                
                new Paragraph({ text: "", spacing: { before: 200 } }),
                
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Bill No: ", bold: true, font: "Calibri" }), new TextRun({ text: invoiceData.billNo, font: "Calibri" })] }),
                                        new Paragraph({ children: [new TextRun({ text: "MONTH: ", bold: true, font: "Calibri" }), new TextRun({ text: invoiceData.month, font: "Calibri" })] }),
                                    ],
                                    margins: cellMargins,
                                    verticalAlign: VerticalAlign.CENTER
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "PO.NO: ", bold: true, font: "Calibri" }), new TextRun({ text: invoiceData.poNo, font: "Calibri" })], alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ children: [new TextRun({ text: "Site: ", bold: true, font: "Calibri" }), new TextRun({ text: invoiceData.site, font: "Calibri" })], alignment: AlignmentType.RIGHT }),
                                    ],
                                    margins: cellMargins,
                                    verticalAlign: VerticalAlign.CENTER
                                }),
                            ],
                        }),
                    ],
                }),
                
                new Paragraph({ children: [new TextRun({ text: "CHARGES AS FOLLOWS: -", bold: true, font: "Calibri" })], spacing: { before: 200, after: 100 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: headerCells,
                        }),
                        ...invoiceData.items.map((item, index) => new DocxTableRow({
                            children: [
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), size: (settings.tableBodyFontSize || 11) * 2, font: "Calibri" })], alignment: AlignmentType.CENTER })], borders: {...tableCellBorders, ...tableBottomBorder}, margins: cellMargins }),
                                ...sortedColumns.map(col => {
                                    const cellContent = item[col.id];
                                    const alignment = col.align === 'right' ? AlignmentType.RIGHT : col.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
                                    const tableBodyFontSize = settings.tableBodyFontSize || 11;

                                    if (col.id === 'amount' && typeof cellContent === 'number') {
                                        return new DocxTableCell({
                                            verticalAlign: VerticalAlign.CENTER,
                                            children: [new Paragraph({ children: [new TextRun({ text: `${cellContent.toLocaleString('en-IN')}/-`, size: tableBodyFontSize * 2, font: "Calibri" })], alignment })],
                                            borders: {...tableCellBorders, ...tableBottomBorder},
                                            margins: cellMargins
                                        });
                                    }
                                    
                                    const textRuns = (cellContent !== undefined && cellContent !== null && cellContent !== '') ? createFormattedTextRuns(cellContent, tableBodyFontSize) : [new TextRun({text: "", font: "Calibri"})];
                                    return new DocxTableCell({
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({ children: textRuns, alignment })],
                                        borders: {...tableCellBorders, ...tableBottomBorder},
                                        margins: cellMargins
                                    });
                                })
                            ],
                        })),
                        createTotalRow('Net total=', formatCurrency(invoiceData.netTotal)),
                        createTotalRow('CGST@9%', formatCurrency(invoiceData.cgst)),
                        createTotalRow('SGST@9%', formatCurrency(invoiceData.sgst)),
                        createTotalRow('TOTAL AMOUNT PAYABLE', formatCurrency(invoiceData.grandTotal)),
                    ],
                }),

                new Paragraph({ children: [new TextRun({ text: "In words: ", font: "Calibri" }), new TextRun({ text: invoiceData.amountInWords, bold: true, font: "Calibri" })], spacing: { before: 200, after: 200 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.myCompany.companyName, bold: true, font: "Calibri" })] }),
                                        new Paragraph({ children: [new TextRun({ text: "PAN CARD NO: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.pan, font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: "GSTIN: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.gstin, font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: "SAC code: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.sacCode, font: "Calibri"})] }),
                                        new Paragraph({ text: " ", spacing: { before: 100 } }),
                                        new Paragraph({ children: [new TextRun({ text: "Bank Details", bold: true, font: "Calibri" })] }),
                                        new Paragraph({ children: [new TextRun({ text: "Bank Name: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.bankName, font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: "A/C No: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.accountNumber, font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: "IFSC Code: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.ifscCode, font: "Calibri"})] }),
                                        new Paragraph({ children: [new TextRun({ text: "Branch: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.myCompany.bankBranch, font: "Calibri"})] }),
                                    ],
                                    borders: { ...tableHeaderBorders },
                                    margins: cellMargins
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true, font: "Calibri" })] }),
                                        ...(invoiceData.to.gstin ? [new Paragraph({ children: [new TextRun({ text: "GSTIN: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.to.gstin, font: "Calibri"})] })] : []),
                                        
                                        ...((invoiceData.to.bankName || invoiceData.to.accountNumber || invoiceData.to.ifscCode || invoiceData.to.bankBranch) ? [
                                            new Paragraph({ text: " ", spacing: { before: 100 } }),
                                            new Paragraph({ children: [new TextRun({ text: "Bank Details", bold: true, font: "Calibri" })] })
                                        ] : []),
                                        
                                        ...(invoiceData.to.bankName ? [new Paragraph({ children: [new TextRun({ text: "Bank Name: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.to.bankName, font: "Calibri"})] })] : []),
                                        ...(invoiceData.to.accountNumber ? [new Paragraph({ children: [new TextRun({ text: "A/C No: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.to.accountNumber, font: "Calibri"})] })] : []),
                                        ...(invoiceData.to.ifscCode ? [new Paragraph({ children: [new TextRun({ text: "IFSC Code: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.to.ifscCode, font: "Calibri"})] })] : []),
                                        ...(invoiceData.to.bankBranch ? [new Paragraph({ children: [new TextRun({ text: "Branch: ", bold: true, font: "Calibri" }), new TextRun({text: invoiceData.to.bankBranch, font: "Calibri"})] })] : []),
                                    ],
                                    borders: { ...tableHeaderBorders },
                                    margins: cellMargins
                                }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ children: [new TextRun({text: "Thanking you,", font: "Calibri"})], spacing: { before: 400 } }),
                new Paragraph({ children: [new TextRun({text: "Yours truly,", font: "Calibri"})] }),
                new Paragraph({ children: [new TextRun({text: `For M/s ${invoiceData.myCompany.companyName}`, font: "Calibri"})] }),
                new Paragraph({ text: "", spacing: { before: 800 } }),
                new Paragraph({ children: [new TextRun({ text: invoiceData.myCompany.contactPerson, bold: true, font: "Calibri" })] }),
                new Paragraph({ children: [new TextRun({text: invoiceData.myCompany.contactNumber, font: "Calibri"})] }),
            ],
        }],
    });

    const companyNameForFile = clientCompany.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
    const monthYear = format(parseISO(invoice.billDate), 'MMM-yy').toUpperCase();
    const fileName = `Bill no.${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}-${companyNameForFile}-(${monthYear})-GST 18.docx`;

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
}
