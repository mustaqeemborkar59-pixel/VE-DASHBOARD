
'use client';

import React from 'react';
import type { Invoice, Company, CompanySettings } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import { Separator } from './ui/separator';

interface InvoicePreviewProps {
  invoice: Invoice | null;
  company: Company | null;
  myCompanyDetails: CompanySettings | null;
}

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: true,
      ignoreZeroCurrency: false,
    }
});

const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });


export function InvoicePreview({ invoice, company, myCompanyDetails }: InvoicePreviewProps) {
  if (!invoice || !company || !myCompanyDetails) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Select an invoice to see the preview.
      </div>
    );
  }
  
  const amountInWords = toWords.convert(invoice.grandTotal);

  return (
    <div className="bg-white text-black p-8 rounded-lg shadow-lg max-w-4xl mx-auto font-['Calibri',_sans-serif] text-sm">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Invoice</h1>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p>To,</p>
          <p className="font-bold text-base">{company.name}</p>
          <p className="whitespace-pre-wrap">{company.address}</p>
          {company.gstin && <p>GSTIN: {company.gstin}</p>}
        </div>
        <div className="text-right">
          <p>
            <span className="font-bold">Bill Date: </span>
            {format(parseISO(invoice.billDate), 'dd/MM/yyyy')}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 mb-4">
         <div>
          <p><span className="font-bold">Bill No:</span> {invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</p>
          <p><span className="font-bold">MONTH:</span> {format(parseISO(invoice.billDate), 'MMM yyyy').toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">PO.NO:</span> {invoice.poNumber || 'AGREEMENT'}</p>
          <p><span className="font-bold">Site:</span> {invoice.site || 'N/A'}</p>
        </div>
      </section>
      
      <p className="font-bold mb-2">CHARGES AS FOLLOWS: -</p>

      <table className="w-full border-collapse border border-black mb-4">
        <thead>
          <tr>
            <th className="border border-black p-2 w-[8%] text-center">Sr. No</th>
            <th className="border border-black p-2 text-left">Particulars</th>
            <th className="border border-black p-2 w-[15%] text-right">Rate</th>
            <th className="border border-black p-2 w-[18%] text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td className="border border-black p-2 text-center">{index + 1}</td>
              <td className="border border-black p-2 whitespace-pre-wrap">{item.particulars}</td>
              <td className="border border-black p-2 text-right">{item.rate || ''}</td>
              <td className="border border-black p-2 text-right">{item.amount.toFixed(2)}/-</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="border border-black p-2 text-right font-bold">Net total=</td>
            <td className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold">{formatCurrency(invoice.netTotal)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-2 text-right font-bold">CGST@9%</td>
             <td className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold">{formatCurrency(invoice.cgst)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-2 text-right font-bold">SGST@9%</td>
             <td className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold">{formatCurrency(invoice.sgst)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-black p-2 text-right font-bold text-base">TOTAL AMOUNT PAYABLE</td>
             <td className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold text-base">{formatCurrency(invoice.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-6">
        <span className="font-bold">In words:</span> {amountInWords}
      </p>

      <Separator className="my-4 bg-gray-400" />
      
      <section className="grid grid-cols-2 gap-4 mb-8">
        <div>
            <p className="font-bold">{myCompanyDetails.companyName}</p>
            <p><span className="font-bold">PAN CARD NO:</span> {myCompanyDetails.pan}</p>
            <p><span className="font-bold">GSTIN:</span> {myCompanyDetails.gstin}</p>
            <p><span className="font-bold">SAC code:</span> {myCompanyDetails.sacCode}</p>
            <br/>
            <p className="font-bold">Bank Details</p>
            <p><span className="font-bold">Bank Name:</span> {myCompanyDetails.bankName}</p>
            <p><span className="font-bold">A/C No:</span> {myCompanyDetails.accountNumber}</p>
            <p><span className="font-bold">IFSC Code:</span> {myCompanyDetails.ifscCode}</p>
            <p><span className="font-bold">Branch:</span> {myCompanyDetails.bankBranch}</p>
        </div>
        <div className="border-l border-gray-400 pl-4">
            <p className="font-bold">{company.name}</p>
            {company.gstin && <p><span className="font-bold">GSTIN:</span> {company.gstin}</p>}
            
            {(company.bankName || company.accountNumber || company.ifscCode || company.bankBranch) && (
              <>
                <br/>
                <p className="font-bold">Bank Details</p>
                {company.bankName && <p><span className="font-bold">Bank Name:</span> {company.bankName}</p>}
                {company.accountNumber && <p><span className="font-bold">A/C No:</span> {company.accountNumber}</p>}
                {company.ifscCode && <p><span className="font-bold">IFSC Code:</span> {company.ifscCode}</p>}
                {company.bankBranch && <p><span className="font-bold">Branch:</span> {company.bankBranch}</p>}
              </>
            )}
        </div>
      </section>

      <footer className="mt-12">
        <p>Thanking you,</p>
        <p>Yours truly,</p>
        <p>For M/s {myCompanyDetails.companyName}</p>
        <br />
        <br />
        <p className="font-bold">{myCompanyDetails.contactPerson}</p>
        <p>{myCompanyDetails.contactNumber}</p>
      </footer>
    </div>
  );
}
