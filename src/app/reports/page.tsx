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
        const fromDate = dateRange.from;
        const toDate = dateRange.to || dateRange.from; // if `to` is not selected, consider it a single day range
        return invoiceDate >= fromDate && invoiceDate <= toDate;
      }
      return true; // No date range filter
    });

    const totalRevenue = filtered.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const totalInvoices = filtered.length;

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
      totalRevenue,
      totalInvoices,
      maintenanceItems,
      selectedCompanyName: selectedCompanyId === 'All' ? 'All Companies' : companies.find(c => c.id === selectedCompanyId)?.name
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
                <CardTitle>Company Maintenance Report</CardTitle>
                <CardDescription>
                  Har company ka kachha chittha: maintenance, kharcha aur aamdani ka poora record.
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
        </Card>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-10">Loading report data...</div>
        ) : reportData ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">from {reportData.selectedCompanyName}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalInvoices}</div>
                        <p className="text-xs text-muted-foreground">generated for {reportData.selectedCompanyName}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Work Log</CardTitle>
                    <CardDescription>
                        A complete list of all maintenance items from invoices for the selected criteria.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No maintenance records found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </div>
        ) : (
            <div className="text-center text-muted-foreground py-10">No data available to generate report.</div>
        )}
      </div>
    </AppLayout>
  );
}