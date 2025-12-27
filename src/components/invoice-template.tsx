'use client';
import React from 'react';
import { Separator } from './ui/separator';

export interface InvoiceData {
  to: {
    name: string;
    address: string;
    gstin: string;
  };
  billDate: string;
  billNo: string;
  poNo: string;
  month: string;
  site: string;
  items: { particulars: string; amount: number }[];
  netTotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  amountInWords: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ data }, ref) => {
  
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) + '/-';
    };

  return (
    <div ref={ref} className="p-10 bg-white text-black font-sans text-xs">
        <div className="flex justify-between items-start">
            <div className="w-1/2">
                <h1 className="text-2xl font-bold mb-4">VITHAL ENTERPRISES</h1>
            </div>
            <div className="w-1/2 text-right">
                <h2 className="text-lg font-bold underline">TAX INVOICE</h2>
                <p className="mt-4">Bill Date: {data.billDate}</p>
            </div>
        </div>

        <div className="mt-8 flex justify-between">
            <div className="w-1/2 pr-4">
                <p className="font-bold">To,</p>
                <p className="font-bold">{data.to.name}</p>
                <p className="whitespace-pre-wrap">{data.to.address}</p>
            </div>
            <div></div>
        </div>
      
        <div className="mt-4 flex justify-between items-start">
             <div className="w-1/2 pr-4">
                <p>Bill No: {data.billNo}</p>
                <p>MONTH: {data.month}</p>
             </div>
             <div className="w-1/2 text-left pl-4">
                <p>PO.NO: {data.poNo}</p>
                <p>Site: {data.site}</p>
             </div>
        </div>

        <p className="font-bold mt-6">CHARGES AS FOLLOWS: -</p>
        
        <div className="mt-2">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-t-2 border-black">
                        <th className="py-2 text-left font-bold w-3/4">Particulars</th>
                        <th className="py-2 text-right font-bold w-1/4">Amount (RS.)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, index) => (
                        <tr key={index}>
                            <td className="py-2 pr-2">{item.particulars}</td>
                            <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                        </tr>
                    ))}
                    {/* Add empty rows for spacing to push totals down */}
                    {Array.from({ length: 15 - data.items.length }).map((_, i) => (
                       <tr key={`empty-${i}`}><td className="py-2">&nbsp;</td><td className="py-2">&nbsp;</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <div className="flex justify-end mt-2">
            <div className="w-1/2">
                <div className="flex justify-between border-t border-black pt-1">
                    <p>Net total=</p>
                    <p className="text-right">{formatCurrency(data.netTotal)}</p>
                </div>
                <div className="flex justify-between">
                    <p>CGST@9%</p>
                    <p className="text-right">{formatCurrency(data.cgst)}</p>
                </div>
                <div className="flex justify-between">
                    <p>SGST@9%</p>
                    <p className="text-right">{formatCurrency(data.sgst)}</p>
                </div>
            </div>
        </div>

        <div className="flex justify-between font-bold border-t border-b border-black py-2 mt-2">
            <p>Total Amount payable</p>
            <p className="text-right">{formatCurrency(data.grandTotal)}</p>
        </div>
        
        <p className="mt-2">In words: {data.amountInWords.toUpperCase()}</p>

        <div className="mt-8 flex justify-between items-start text-xs">
            <div className="w-1/2 pr-4 space-y-1">
                <p className="font-bold">Vithal Enterprises</p>
                <p>PAN CARD NO- AFVPM0759G</p>
                <p>SERVICE TAX CODE NO-AFVPM0759GST001</p>
                <p>GSTIN: 27AFVPM0759G1ZY</p>
                <div>
                  <p>SAC code: 997319</p>
                  <p className="ml-[58px]">998519</p>
                </div>
            </div>
            <div className="w-1/2 pl-4 space-y-1">
                <p className="font-bold">{data.to.name}</p>
                <p>GSTIN: {data.to.gstin}</p>
            </div>
        </div>
        
        <div className="mt-16 flex justify-between items-end">
            <div className='text-left'>
                <p>Thanking you,</p>
                <p>Yours truly,</p>
                <p className="mt-2">For M/s Vithal Enterprises</p>
            </div>
            <div></div>
        </div>
        
        <div className="mt-16 flex justify-between">
            <div>
                <p>R.V MAVLANKAR</p>
                <p>9821728079</p>
            </div>
        </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';
