
import { Packer, Document, Paragraph, TextRun, AlignmentType, BorderStyle, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, VerticalAlign, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import type { Invoice, Company } from './data';

const generateInvoiceDataForWord = (invoice: Invoice, company: Company) => {
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
          name: company.name,
          address: company.address,
          gstin: company.gstin || '',
        },
        billDate: format(parseISO(invoice.billDate), 'dd/MM/yyyy'),
        billNo: `${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}`,
        poNo: invoice.poNumber || 'AGREEMENT',
        month: format(parseISO(invoice.billDate), 'MMM yyyy').toUpperCase(),
        site: invoice.site || '',
        items: invoice.items,
        netTotal: invoice.netTotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        grandTotal: invoice.grandTotal,
        amountInWords: grandTotalInWords,
    }
}

export const generateAndDownloadInvoice = async (invoice: Invoice, company: Company) => {
    const invoiceData = generateInvoiceDataForWord(invoice, company);
    
    const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/-';

    const doc = new Document({
        styles: {
            paragraphStyles: [{
                id: "default",
                name: "default",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    font: "Calibri",
                    size: 22, // 11pt
                },
            }],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 2.54cm = 1440 twips
                    size: { orientation: PageOrientation.PORTRAIT }
                },
            },
            children: [
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "TAX INVOICE", bold: true, underline: {}, size: 28 })], alignment: AlignmentType.CENTER, style: 'default' })], verticalAlign: VerticalAlign.CENTER }),
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: `Bill Date: ${invoiceData.billDate}`, alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "\n" }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    columnWidths: [4500, 5500],
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    width: { size: 45, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "To," })] }),
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true })] }),
                                        new Paragraph({ text: invoiceData.to.address }),
                                    ],
                                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                                }),
                                new DocxTableCell({
                                    width: { size: 55, type: WidthType.PERCENTAGE },
                                    children: [],
                                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                                })
                            ],
                        }),
                    ]
                }),
                new Paragraph({ text: "\n" }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                                    new Paragraph(`Bill No: ${invoiceData.billNo}`),
                                    new Paragraph(`MONTH: ${invoiceData.month}`),
                                ]}),
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                                    new Paragraph(`PO.NO: ${invoiceData.poNo}`),
                                    new Paragraph(`Site: ${invoiceData.site}`),
                                ]}),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "\n" }),
                new Paragraph({ children: [new TextRun({ text: "CHARGES AS FOLLOWS: -", bold: true })] }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Particulars", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 2 }, bottom: { style: BorderStyle.SINGLE, size: 2 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, verticalAlign: VerticalAlign.CENTER }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount (RS.)", bold: true })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, size: 2 }, bottom: { style: BorderStyle.SINGLE, size: 2 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, verticalAlign: VerticalAlign.CENTER }),
                            ],
                        }),
                        ...invoiceData.items.map(item => new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph(item.particulars)], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                                new DocxTableCell({ children: [new Paragraph({ text: formatCurrency(item.amount), alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                            ],
                        })),
                    ],
                }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                         new DocxTableRow({ children: [
                            new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                            new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                                new Paragraph({ text: `Net total=\t${formatCurrency(invoiceData.netTotal)}`, style: "default" }),
                                new Paragraph({ text: `CGST@9%\t${formatCurrency(invoiceData.cgst)}` }),
                                new Paragraph({ text: `SGST@9%\t${formatCurrency(invoiceData.sgst)}` }),
                            ], borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                        ]}),
                        new DocxTableRow({ children: [
                            new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Total Amount payable", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                            new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(invoiceData.grandTotal), bold: true })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                        ]}),
                    ],
                    columnWidths: [5000, 5000],
                }),
                new Paragraph({ text: `In words: ${invoiceData.amountInWords}` }),
                new Paragraph({ text: "\n\n" }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                                    new Paragraph({ children: [new TextRun({ text: "Vithal Enterprises", bold: true })] }),
                                    new Paragraph("PAN CARD NO- AFVPM0759G"),
                                    new Paragraph("SERVICE TAX CODE NO-AFVPM0759GST001"),
                                    new Paragraph("GSTIN: 27AFVPM0759G1ZY"),
                                    new Paragraph("SAC code: 997319\n          998519"),
                                ]}),
                                new DocxTableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                                    new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true })] }),
                                    new Paragraph(`GSTIN: ${invoiceData.to.gstin}`),
                                ]}),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "\n\n\n" }),
                new Paragraph("Thanking you,"),
                new Paragraph("Yours truly,"),
                new Paragraph({ text: "\n" }),
                new Paragraph("For M/s Vithal Enterprises"),
                new Paragraph({ text: "\n\n\n\n" }),
                new Paragraph("R.V MAVLANKAR"),
                new Paragraph("9821728079"),
            ],
        }],
    });
    
    const companyName = company.name.replace(/[\s/.]+/g, '-').toUpperCase();
    const billMonthYear = format(parseISO(invoice.billDate), 'MMM-yy').toUpperCase();
    
    const fileName = `Bill no.${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}-${companyName}-(${billMonthYear})-GST 18^L1.docx`;

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
}
