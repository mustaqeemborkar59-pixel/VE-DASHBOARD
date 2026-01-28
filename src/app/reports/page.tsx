'use client';

import { useState, useMemo } from 'react';
import type { DateRange } from 'date-fns';
import { format, parseISO } from 'date-fns';

import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Invoice, Company } from '@/lib/data';

export default function ReportsPage() {
  const { firestore } = useFirebase();

  // State for filters
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('All');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Data fetching
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);

  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

  const isLoading = isLoadingCompanies || isLoadingInvoices;

  // Process data based on filters
  const reportData = useMemo(() => {
    if (!invoices || !companies) return null;

    const filtered = invoices.filter(invoice => {
      const companyMatch = selectedCompanyId === 'All' || invoice.companyId === selectedCompanyId;
      if (!companyMatch) return false;

      if (dateRange?.from) {
        const invoiceDate = parseISO(invoice.billDate);
        const fromDate = new Date(dateRange.from.setHours(0, 0, 0, 0));
        const toDate = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date(dateRange.from.setHours(23, 59, 59, 999));
        return invoiceDate >= fromDate && invoiceDate <= toDate;
      }
      return true; // No date range filter
    });

    const maintenanceItems = filtered.flatMap(invoice =>
      invoice.items.map(item => ({
        ...item,
        invoiceId: invoice.id,
        billNo: invoice.billNo,
        billDate: invoice.billDate,
        companyName: companies.find(c => c.id === invoice.companyId)?.name || 'Unknown',
      }))
    );

    return {
      maintenanceItems,
    };
  }, [invoices, companies, selectedCompanyId, dateRange]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Maintenance Report</CardTitle>
                <CardDescription>
                  Har company ke liye kiye gaye maintenance kaamo ka poora record (invoices ke anusaar).
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} disabled={isLoadingCompanies}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Companies</SelectItem>
                    {companies?.map(company => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DatePickerWithRange onDateChange={setDateRange} className="w-full sm:w-auto" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="text-center text-muted-foreground py-10">Loading report data...</div>
            ) : reportData ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            {selectedCompanyId === 'All' && <TableHead>Company</TableHead>}
                            <TableHead>Bill No.</TableHead>
                            <TableHead>Work Performed (Particulars)</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.maintenanceItems.length > 0 ? (
                            reportData.maintenanceItems.map((item, index) => (
                                <TableRow key={`${item.invoiceId}-${index}`}>
                                    <TableCell>{format(parseISO(item.billDate), 'dd MMM, yyyy')}</TableCell>
                                    {selectedCompanyId === 'All' && <TableCell>{item.companyName}</TableCell>}
                                    <TableCell>{item.billNo}</TableCell>
                                    <TableCell className="whitespace-pre-wrap">{item.particulars}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={selectedCompanyId === 'All' ? 5 : 4} className="h-24 text-center">
                                    No maintenance records found for the selected criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center text-muted-foreground py-10">No data available to generate report.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
