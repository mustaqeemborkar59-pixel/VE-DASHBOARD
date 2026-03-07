'use client';

import { Packer, Document, Paragraph, TextRun, AlignmentType, BorderStyle, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, VerticalAlign, PageOrientation, PageSize } from 'docx';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import type { Salary, Employee, CompanySettings } from './data';

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: true,
      ignoreZeroCurrency: false,
    }
});

export const generateSalarySlip = async (salary: Salary, employee: Employee, company: CompanySettings) => {
    const netSalaryWords = toWords.convert(salary.netSalary).toUpperCase();
    const monthDisplay = format(parseISO(`${salary.month}-01`), 'MMMM yyyy').toUpperCase();
    const paymentDateDisplay = salary.paymentDate ? format(parseISO(salary.paymentDate), 'dd/MM/yyyy') : 'N/A';

    const cellMargins = { top: 100, bottom: 100, left: 150, right: 150 };
    const borderStyle = { style: BorderStyle.SINGLE, size: 6, color: "000000" };

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: PageSize.A4,
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
            },
            children: [
                new Paragraph({
                    children: [new TextRun({ text: company.companyName.toUpperCase(), bold: true, size: 32, font: "Calibri" })],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [new TextRun({ text: "SALARY SLIP", bold: true, size: 24, font: "Calibri", underline: {} })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Employee Name:", bold: true, font: "Calibri" }), new TextRun({ text: ` ${employee.fullName}` })] })],
                                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Month:", bold: true, font: "Calibri" }), new TextRun({ text: ` ${monthDisplay}` })] })],
                                    borders: { top: borderStyle, bottom: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                            ],
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Designation:", bold: true, font: "Calibri" }), new TextRun({ text: ` ${employee.specialization || 'N/A'}` })] })],
                                    borders: { bottom: borderStyle, left: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Payment Date:", bold: true, font: "Calibri" }), new TextRun({ text: ` ${paymentDateDisplay}` })] })],
                                    borders: { bottom: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ text: "", spacing: { before: 400 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Particulars", bold: true, alignment: AlignmentType.CENTER })], borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Amount (INR)", bold: true, alignment: AlignmentType.CENTER })], borders: { top: borderStyle, bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Basic Salary" })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: salary.baseSalary.toLocaleString('en-IN'), alignment: AlignmentType.RIGHT })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Bonus / Incentives" })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: salary.bonus.toLocaleString('en-IN'), alignment: AlignmentType.RIGHT })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Absent Deduction" })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: `(-) ${salary.absentDeduction.toLocaleString('en-IN')}`, alignment: AlignmentType.RIGHT })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Other Deductions" })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: `(-) ${salary.otherDeductions.toLocaleString('en-IN')}`, alignment: AlignmentType.RIGHT })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Net Salary Payable", bold: true })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: salary.netSalary.toLocaleString('en-IN'), bold: true, alignment: AlignmentType.RIGHT })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                    ],
                }),

                new Paragraph({
                    children: [new TextRun({ text: `Amount in words: ${netSalaryWords}`, font: "Calibri", italic: true })],
                    spacing: { before: 200 },
                }),

                new Paragraph({ text: "", spacing: { before: 1000 } }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [
                                        new Paragraph({ text: "____________________", alignment: AlignmentType.CENTER }),
                                        new Paragraph({ text: "Employee Signature", alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })
                                    ]
                                }),
                                new DocxTableCell({
                                    children: [
                                        new Paragraph({ text: "____________________", alignment: AlignmentType.CENTER }),
                                        new Paragraph({ text: "Authorized Signatory", alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })
                                    ]
                                }),
                            ]
                        })
                    ]
                }),
            ],
        }],
    });

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.docx`;
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
};