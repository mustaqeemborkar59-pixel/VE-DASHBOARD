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
    const dojDisplay = employee.doj ? format(parseISO(employee.doj), 'dd/MM/yyyy') : 'N/A';

    const grossEarnings = (salary.baseSalary || 0) + (salary.hra || 0) + (salary.conveyance || 0) + (salary.medical || 0) + (salary.special || 0) + (salary.bonus || 0) + (salary.ot || 0);
    const totalDeductions = (salary.pf || 0) + (salary.esic || 0) + (salary.tds || 0) + (salary.advance || 0) + (salary.otherDeductions || 0) + (salary.lwf || 0) + (salary.absentDeduction || 0);

    const cellMargins = { top: 100, bottom: 100, left: 150, right: 150 };
    const borderStyle = { style: BorderStyle.SINGLE, size: 6, color: "000000" };

    const createTableRow = (label: string, value: string, isBold = false) => {
        return new DocxTableRow({
            children: [
                new DocxTableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: isBold, font: "Calibri", size: 18 })] })],
                    borders: { bottom: borderStyle, left: borderStyle, right: borderStyle },
                    margins: cellMargins,
                }),
                new DocxTableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: value, bold: isBold, font: "Calibri", size: 18 })], alignment: AlignmentType.RIGHT })],
                    borders: { bottom: borderStyle, right: borderStyle },
                    margins: cellMargins,
                }),
            ],
        });
    };

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
                    children: [new TextRun({ text: company.address, size: 18, font: "Calibri" })],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Contact: ${company.contactNumber} | GSTIN: ${company.gstin}`, size: 18, font: "Calibri" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `SALARY SLIP - ${monthDisplay}`, bold: true, size: 24, font: "Calibri", underline: {} })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),

                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Employee Name:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${employee.fullName}`, size: 18, font: "Calibri" })] })],
                                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Salary Month:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${monthDisplay}`, size: 18, font: "Calibri" })] })],
                                    borders: { top: borderStyle, bottom: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                            ],
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Designation:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${employee.specialization || 'N/A'}`, size: 18, font: "Calibri" })] })],
                                    borders: { bottom: borderStyle, left: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Work Days:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${salary.workingDays}`, size: 18, font: "Calibri" })] })],
                                    borders: { bottom: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                            ],
                        }),
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Date of Joining:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${dojDisplay}`, size: 18, font: "Calibri" })] })],
                                    borders: { bottom: borderStyle, left: borderStyle, right: borderStyle },
                                    margins: cellMargins,
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Present Days:", bold: true, font: "Calibri", size: 18 }), new TextRun({ text: ` ${salary.presentDays}`, size: 18, font: "Calibri" })] })],
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
                                new DocxTableCell({ children: [new Paragraph({ text: "EARNINGS", bold: true, alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })], borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "AMOUNT", bold: true, alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })], borders: { top: borderStyle, bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "DEDUCTIONS", bold: true, alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })], borders: { top: borderStyle, bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "AMOUNT", bold: true, alignment: AlignmentType.CENTER, font: "Calibri", size: 18 })], borders: { top: borderStyle, bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 1: Basic & Absent
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Basic Salary", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.baseSalary || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Absent Deduction", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.absentDeduction || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 2: HRA & PF
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "H.R.A.", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.hra || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Provident Fund (PF)", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.pf || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 3: Conveyance & ESIC
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Conveyance", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.conveyance || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "E.S.I.C.", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.esic || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 4: Medical & TDS
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Medical Allowance", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.medical || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "T.D.S.", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.tds || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 5: Special & Advance
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Special Allowance", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.special || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Loan / Advance", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.advance || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 6: Bonus & LWF
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Bonus / Incentives", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.bonus || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "L.W.F.", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.lwf || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Row 7: OT & Other
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Overtime (OT)", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.ot || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Other Deductions", font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: (salary.otherDeductions || 0).toLocaleString('en-IN'), alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                        // Totals Row
                        new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ text: "Gross Total", bold: true, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, left: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: grossEarnings.toLocaleString('en-IN'), bold: true, alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: "Total Deductions", bold: true, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                                new DocxTableCell({ children: [new Paragraph({ text: totalDeductions.toLocaleString('en-IN'), bold: true, alignment: AlignmentType.RIGHT, font: "Calibri", size: 18 })], borders: { bottom: borderStyle, right: borderStyle }, margins: cellMargins }),
                            ]
                        }),
                    ],
                }),

                new Paragraph({ text: "", spacing: { before: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: "NET PAYABLE SALARY: ", bold: true, font: "Calibri", size: 22 }),
                        new TextRun({ text: `Rs. ${salary.netSalary.toLocaleString('en-IN')}/-`, bold: true, font: "Calibri", size: 22 })
                    ],
                    spacing: { before: 200 },
                }),

                new Paragraph({
                    children: [new TextRun({ text: `Amount in words: ${netSalaryWords}`, font: "Calibri", italic: true, size: 18 })],
                    spacing: { before: 100 },
                }),

                new Paragraph({ text: "", spacing: { before: 800 } }),

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
                
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                    children: [new TextRun({ text: `This is a system generated salary slip and does not require a physical signature.`, size: 14, font: "Calibri", color: "666666" })],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Generated on ${format(new Date(), 'dd MMM yyyy, p')}`, size: 14, font: "Calibri", color: "666666" })],
                    alignment: AlignmentType.CENTER,
                }),
            ],
        }],
    });

    const fileName = `SalarySlip_${employee.fullName.replace(/\s+/g, '_')}_${salary.month}.docx`;
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
};
