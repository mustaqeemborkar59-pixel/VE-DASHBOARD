
'use client';
import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { PlusCircle, Search, XCircle } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Invoice, Company, Payment } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

type PaymentStatus = 'All' | 'Paid' | 'Partial' | 'Pending';

export default function PaymentsPage() {
  const { firestore } = useFirebase();

  // Data fetching
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc')) : null, [firestore]);

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies || isLoadingPayments;

  // Filters
  const [companyFilter, setCompanyFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('All');
  const [searchFilter, setSearchFilter] = useState('');

  const getPaymentDetails = useCallback((invoiceId: string) => {
    const relevantPayments = payments?.filter(p => p.invoiceId === invoiceId) || [];
    const totalPaid = relevantPayments.reduce((acc, p) => acc + p.receivedAmount, 0);
    const totalTds = relevantPayments.reduce((acc, p) => acc + (p.tdsDeducted || 0), 0);
    const totalDeductions = relevantPayments.reduce((acc, p) => acc + (p.otherDeductions || 0), 0);
    return { totalPaid, totalTds, totalDeductions };
  }, [payments]);

  const processedInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.map(invoice => {
      const { totalPaid, totalTds, totalDeductions } = getPaymentDetails(invoice.id);
      const totalReceived = totalPaid + totalTds + totalDeductions;
      const balance = invoice.grandTotal - totalReceived;

      let status: Omit<PaymentStatus, 'All'>;
      if (balance <= 0) {
        status = 'Paid';
      } else if (totalReceived > 0 && balance > 0) {
        status = 'Partial';
      } else {
        status = 'Pending';
      }
      
      const tdsPercentage = totalPaid > 0 ? (totalTds / totalPaid) * 100 : 0;

      return {
        ...invoice,
        companyName: companies?.find(c => c.id === invoice.companyId)?.name || 'Unknown',
        totalPaid,
        totalTds,
        totalDeductions,
        balance,
        status,
        tdsPercentage
      };
    });
  }, [invoices, companies, getPaymentDetails]);

  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter(invoice => {
      const companyMatch = companyFilter === 'All' || invoice.companyId === companyFilter;
      const statusMatch = statusFilter === 'All' || invoice.status === statusFilter;
      
      const dateMatch = !dateRangeFilter || !dateRangeFilter.from || (
        parseISO(invoice.billDate) >= dateRangeFilter.from &&
        (!dateRangeFilter.to || parseISO(invoice.billDate) <= dateRangeFilter.to)
      );

      const searchLower = searchFilter.toLowerCase();
      const searchMatch = searchFilter === '' ||
        invoice.billNo.toString().includes(searchLower) ||
        invoice.companyName.toLowerCase().includes(searchLower);

      return companyMatch && statusMatch && dateMatch && searchMatch;
    });
  }, [processedInvoices, companyFilter, statusFilter, dateRangeFilter, searchFilter]);
  
  const summary = useMemo(() => {
      const totalBilled = filteredInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalReceived = filteredInvoices.reduce((acc, inv) => acc + inv.totalPaid, 0);
      const totalTds = filteredInvoices.reduce((acc, inv) => acc + inv.totalTds, 0);
      const totalPending = filteredInvoices.reduce((acc, inv) => acc + inv.balance, 0);
      return { totalBilled, totalReceived, totalTds, totalPending };
  }, [filteredInvoices]);

  const clearFilters = () => {
    setCompanyFilter('All');
    setStatusFilter('All');
    setDateRangeFilter(undefined);
    setSearchFilter('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }
  
  const getStatusBadge = (status: Omit<PaymentStatus, 'All'>) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600/80 text-white">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-500/80 text-white">Partial</Badge>;
      case 'Pending':
        return <Badge variant="destructive">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Tracking & Reconciliation</CardTitle>
            <CardDescription>Monitor and manage invoice payments.</CardDescription>
          </CardHeader>
           <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Billed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatCurrency(summary.totalBilled)}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-200">{formatCurrency(summary.totalReceived)}</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total TDS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-200">{formatCurrency(summary.totalTds)}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-200">{formatCurrency(summary.totalPending)}</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                <div className="relative flex-1">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                      placeholder="Search by Bill No. or Company..."
                      className="pl-8 w-full"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                   />
                </div>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Companies</SelectItem>
                    {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <DatePickerWithRange onDateChange={setDateRangeFilter} />
                <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
                    <XCircle className="mr-2 h-4 w-4"/> Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-3 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Amount Received</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead className="text-right">Deducted</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">Loading payments...</TableCell>
                  </TableRow>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.enterprise.charAt(0)}/{invoice.billNo}</TableCell>
                      <TableCell>{invoice.companyName}</TableCell>
                      <TableCell>{format(parseISO(invoice.billDate), 'dd-MM-yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.grandTotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalPaid)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.totalTds)} 
                        <span className="text-xs text-muted-foreground"> ({invoice.tdsPercentage.toFixed(2)}%)</span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.balance)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                          <Button variant="outline" size="sm">
                             <PlusCircle className="mr-2 h-3.5 w-3.5"/> Add
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">No matching invoices found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
