
import { Packer, Document, Paragraph, TextRun, AlignmentType, BorderStyle, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, VerticalAlign, PageOrientation, convertInchesToTwip, IPageSize, PageSize } from 'docx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import type { Invoice, Company, InvoiceTemplate, InvoiceItem } from './data';

export type PageSettings = {
    size: 'A4' | 'LETTER' | 'LEGAL',
    orientation: 'portrait' | 'landscape',
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    }
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


const generateInvoiceDataForWord = (invoice: Invoice, company: Company, template?: InvoiceTemplate) => {
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
          name: company.name.toUpperCase(),
          address: company.address.toUpperCase(),
          gstin: company.gstin || '',
        },
        billDate: format(parseISO(invoice.billDate), 'dd/MM/yyyy'),
        billNo: `${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}`.toUpperCase(),
        poNo: (invoice.poNumber || 'AGREEMENT').toUpperCase(),
        month: format(parseISO(invoice.billDate), 'MMM yyyy').toUpperCase(),
        site: (invoice.site || '').toUpperCase(),
        items: invoice.items,
        columns: template?.columns || [
            { id: 'particulars' as keyof InvoiceItem, label: 'Particulars', width: 45, align: 'left' as const, order: 1 },
            { id: 'rate' as keyof InvoiceItem, label: 'Rate', width: 20, align: 'right' as const, order: 2 },
            { id: 'amount' as keyof InvoiceItem, label: 'Amount', width: 25, align: 'right' as const, order: 3 },
        ],
        netTotal: invoice.netTotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        grandTotal: invoice.grandTotal,
        amountInWords: grandTotalInWords.toUpperCase(),
    }
}

const createMultiLineText = (text: string | number | undefined) => {
    if (text === undefined || text === null) return [new TextRun("")];
    
    const textAsString = String(text);
    const lines = textAsString.split('\n');
    
    return lines.flatMap((line, index) => {
        const textRuns = [new TextRun(line)];
        if (index < lines.length - 1) {
            textRuns.push(new TextRun({ break: 1 }));
        }
        return textRuns;
    });
};


export const generateAndDownloadInvoice = async (invoice: Invoice, company: Company, pageSettings?: PageSettings, template?: InvoiceTemplate) => {
    const settings = pageSettings || { size: 'A4', orientation: 'portrait', margin: {top: 0.5, right: 0.5, bottom: 0.5, left: 0.5} };
    const invoiceData = generateInvoiceDataForWord(invoice, company, template);
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

    const headerCells = [
        new DocxTableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Sr. No", bold: true })], alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
            borders: tableHeaderBorders,
        }),
        ...sortedColumns.map(column => new DocxTableCell({
            width: { size: column.width, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
                children: [new TextRun({ text: column.label, bold: true })], 
                alignment: (column.label === 'Rate' || column.label === 'Amount') ? AlignmentType.CENTER : (column.align === 'right' ? AlignmentType.RIGHT : column.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT)
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: tableHeaderBorders,
        }))
    ];
    
    const createTotalRow = (label: string, value: string, isGrandTotal = false) => {
        const totalRowsBorders = {
            top: { style: isGrandTotal ? BorderStyle.DOUBLE : BorderStyle.SINGLE },
            bottom: { style: isGrandTotal ? BorderStyle.DOUBLE : BorderStyle.SINGLE },
            left: { style: BorderStyle.SINGLE },
            right: { style: BorderStyle.SINGLE },
        };
        
        return new DocxTableRow({
            height: { value: 350, rule: "atLeast" },
            children: [
                new DocxTableCell({
                    columnSpan: sortedColumns.length,
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })], alignment: AlignmentType.RIGHT })],
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { ...totalRowsBorders, right: { style: BorderStyle.NONE } }
                }),
                new DocxTableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: value, bold: true })], alignment: AlignmentType.RIGHT })],
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { ...totalRowsBorders, left: { style: BorderStyle.NONE } }
                }),
            ]
        });
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
                        top: convertInchesToTwip(settings.margin.top), 
                        right: convertInchesToTwip(settings.margin.right), 
                        bottom: convertInchesToTwip(settings.margin.bottom), 
                        left: convertInchesToTwip(settings.margin.left) 
                    },
                },
            },
            children: [
                new Paragraph({
                    children: [new TextRun({ text: "TAX INVOICE", bold: true, underline: {}, size: 28 })],
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
                                    width: { size: 60, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ text: "To," }),
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true })] }),
                                        new Paragraph({ children: createMultiLineText(invoiceData.to.address) }),
                                    ],
                                }),
                                new DocxTableCell({
                                    width: { size: 40, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: `Bill Date: ${invoiceData.billDate}` })], alignment: AlignmentType.RIGHT }),
                                    ],
                                    verticalAlign: VerticalAlign.TOP
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
                                        new Paragraph({ children: [new TextRun({ text: "Bill No: ", bold: true }), new TextRun({ text: invoiceData.billNo })] }),
                                        new Paragraph({ children: [new TextRun({ text: "MONTH: ", bold: true }), new TextRun({ text: invoiceData.month })] }),
                                    ]
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "PO.NO: ", bold: true }), new TextRun({ text: invoiceData.poNo })], alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ children: [new TextRun({ text: "Site: ", bold: true }), new TextRun({ text: invoiceData.site })], alignment: AlignmentType.RIGHT }),
                                    ]
                                }),
                            ],
                        }),
                    ],
                }),
                
                new Paragraph({ children: [new TextRun({ text: "CHARGES AS FOLLOWS: -", bold: true })], spacing: { before: 200, after: 100 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            height: { value: 350, rule: "atLeast" },
                            children: headerCells,
                        }),
                        ...invoiceData.items.map((item, index) => new DocxTableRow({
                            height: { value: 350, rule: "atLeast" }, 
                            children: [
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })], borders: tableCellBorders }),
                                ...sortedColumns.map(col => new DocxTableCell({
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [new Paragraph({ children: createMultiLineText(item[col.id] as string), alignment: col.align === 'right' ? AlignmentType.RIGHT : col.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT })],
                                    borders: tableCellBorders
                                }))
                            ],
                        })),
                        createTotalRow('Net total=', formatCurrency(invoiceData.netTotal)),
                        createTotalRow('CGST@9%', formatCurrency(invoiceData.cgst)),
                        createTotalRow('SGST@9%', formatCurrency(invoiceData.sgst)),
                        createTotalRow('TOTAL AMOUNT PAYABLE', formatCurrency(invoiceData.grandTotal), true),
                    ],
                }),

                new Paragraph({ children: [new TextRun({ text: "In words: ", underline: {} }), new TextRun({ text: `${invoiceData.amountInWords} ONLY.`, bold: true })], spacing: { before: 200, after: 200 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            height: { value: 1600, rule: "atLeast" },
                            children: [
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Vithal Enterprises", bold: true, underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "PAN CARD NO- ", bold: true }), new TextRun({ text: "AFVPM0759G", underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "SERVICE TAX CODE NO-", bold: true }), new TextRun({ text: "AFVPM0759GST001", underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "GSTIN: 27AFVPM0759G1ZY", bold: true, underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "SAC code: 997319", bold: true, underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "          998519", bold: true, underline: {} })] }),
                                    ],
                                    borders: { ...tableHeaderBorders }
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true, underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "GSTIN: ", bold: true }), new TextRun({ text: invoiceData.to.gstin, underline: {} })] }),
                                    ],
                                    borders: { ...tableHeaderBorders }
                                }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ text: "Thanking you,", spacing: { before: 400 } }),
                new Paragraph({ text: "Yours truly," }),
                new Paragraph({ text: "For M/s Vithal Enterprises" }),
                new Paragraph({ text: "", spacing: { before: 800 } }),
                new Paragraph({ children: [new TextRun({ text: "R.V MAVLANKAR", bold: true })] }),
                new Paragraph({ text: "9821728079" }),
            ],
        }],
    });

    const companyName = company.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
    const monthYear = format(parseISO(invoice.billDate), 'MMM-yy').toUpperCase();
    const fileName = `Bill no.${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}-${companyName}-(${monthYear})-GST 18.docx`;

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
}
