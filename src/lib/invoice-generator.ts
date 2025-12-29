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
        netTotal: invoice.netTotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        grandTotal: invoice.grandTotal,
        amountInWords: grandTotalInWords.toUpperCase(),
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
                run: { font: "Poppins", size: 22 }, 
                paragraph: { spacing: { after: 0, before: 0, line: 276 } }
            }],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 2835, right: 1440, bottom: 1440, left: 1440 }, // 5cm top margin
                    size: { orientation: PageOrientation.PORTRAIT }
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
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.address, bold: true })] }),
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

                // Billing Table with RATE Column
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            height: { value: 350, rule: "atLeast" },
                            children: [
                                new DocxTableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "Sr. No", bold: true })], alignment: AlignmentType.CENTER })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "Particulars", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "Rate", bold: true })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "Amount (RS.)", bold: true })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ],
                        }),
                        ...invoiceData.items.map((item, index) => new DocxTableRow({
                            height: { value: 600, rule: "atLeast" }, 
                            children: [
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })], borders: { right: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ text: item.particulars })], borders: { right: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ text: item.rate ? `${item.rate}/-` : '', alignment: AlignmentType.RIGHT })], borders: { right: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ text: formatCurrency(item.amount), alignment: AlignmentType.RIGHT })], borders: { left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ],
                        })),
                        // Totals Rows
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Net total=", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(invoiceData.netTotal), bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CGST@9%", bold: true })] })], borders: { left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(invoiceData.cgst), bold: true })] })], borders: { left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "SGST@9%", bold: true })] })], borders: { left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(invoiceData.sgst), bold: true })] })], borders: { left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ]
                        }),
                        new DocxTableRow({
                            height: { value: 450, rule: "atLeast" },
                            children: [
                                new DocxTableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "TOTAL AMOUNT PAYABLE", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                                new DocxTableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(invoiceData.grandTotal), bold: true })] })], borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
                            ]
                        }),
                    ],
                }),

                new Paragraph({ children: [new TextRun({ text: "In words: ", underline: {} }), new TextRun({ text: `${invoiceData.amountInWords} ONLY.`, bold: true })], spacing: { before: 200, after: 200 } }),

                // Footer Boxed Table for GST/PAN Details
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
                                    borders: { 
                                        top: { style: BorderStyle.SINGLE }, 
                                        bottom: { style: BorderStyle.SINGLE }, 
                                        left: { style: BorderStyle.SINGLE }, 
                                        right: { style: BorderStyle.SINGLE } 
                                    }
                                }),
                                new DocxTableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.TOP,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: invoiceData.to.name, bold: true, underline: {} })] }),
                                        new Paragraph({ children: [new TextRun({ text: "GSTIN: ", bold: true }), new TextRun({ text: invoiceData.to.gstin, underline: {} })] }),
                                    ],
                                    borders: { 
                                        top: { style: BorderStyle.SINGLE }, 
                                        bottom: { style: BorderStyle.SINGLE }, 
                                        left: { style: BorderStyle.SINGLE }, 
                                        right: { style: BorderStyle.SINGLE } 
                                    }
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

    const companyName = company.name.replace(/\s+/g, '-').toUpperCase();
    const monthYear = format(parseISO(invoice.billDate), 'MMM-yy').toUpperCase();
    const fileName = `Bill no.${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}-${companyName}-(${monthYear})-GST 18.docx`;

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
}
