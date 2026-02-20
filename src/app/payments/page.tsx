'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, XCircle, Info, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Invoice, Company, Payment } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';


type Enterprise = 'Vithal' | 'RV';
type PaymentStatus = 'All' | 'Received' | 'Partial' | 'Pending';
type PaymentMode = 'RTGS' | 'NEFT' | 'IMPS' | 'CHEQUE' | 'CASH';

type ProcessedInvoice = Invoice & {
    companyName: string;
    totalPaid: number;
    totalDeductions: number;
    taxableAmount: number;
    tdsAmount: number;
    balance: number;
    status: Omit<PaymentStatus, 'All'>;
};


export default function PaymentsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  // Data fetching
  const invoicesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'invoices'), orderBy('billNo', 'asc')) : null, [firestore, user]);
  const companiesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore, user]);
  const paymentsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc')) : null, [firestore, user]);

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies || isLoadingPayments;

  // Filters
  const [activeTab, setActiveTab] = useState<Enterprise>('Vithal');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  
  // Dialog States
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<ProcessedInvoice | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [invoiceForDetails, setInvoiceForDetails] = useState<ProcessedInvoice | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);


  // Payment Form State
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivedAmount, setReceivedAmount] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('RTGS');
  const [chequeDetails, setChequeDetails] = useState('');
  
  const closeAllDialogs = useCallback(() => {
    setIsPaymentDialogOpen(false);
    setSelectedInvoiceForPayment(null);
    setIsDetailsDialogOpen(false);
    setInvoiceForDetails(null);
    setPaymentToDelete(null);
  }, []);

  useEffect(() => {
    if (yearFilter === 'All') {
      setMonthFilter('All');
    }
  }, [yearFilter]);


  const getPaymentDetails = useCallback((invoiceId: string) => {
    const relevantPayments = payments?.filter(p => p.invoiceId === invoiceId) || [];
    const totalPaid = relevantPayments.reduce((acc, p) => acc + p.receivedAmount, 0);
    const totalDeductions = relevantPayments.reduce((acc, p) => acc + (p.otherDeductions || 0), 0);
    return { totalPaid, totalDeductions };
  }, [payments]);

  const processedInvoices = useMemo((): ProcessedInvoice[] => {
    if (!invoices) return [];
    return invoices.map(invoice => {
      const { totalPaid, totalDeductions } = getPaymentDetails(invoice.id);
      
      const taxableAmount = invoice.discountType === 'before_gst' 
        ? invoice.netTotal - (invoice.discount || 0) 
        : invoice.netTotal;
      const tdsPercentage = invoice.tdsPercentage || 0;
      const tdsAmount = (taxableAmount * tdsPercentage) / 100;
      
      const totalReceivedWithAdvance = totalPaid + (invoice.advanceReceived || 0);
      const totalCredited = totalReceivedWithAdvance + totalDeductions;
      const rawBalance = invoice.grandTotal - totalCredited - tdsAmount;
      const roundedBalance = Math.round(rawBalance);

      let status: Omit<PaymentStatus, 'All'>;
      let finalBalance = roundedBalance;

      if (roundedBalance <= 0) {
        status = 'Received';
        finalBalance = 0; // If paid or overpaid, show balance as 0.
      } else if (totalCredited > 0 && roundedBalance > 0) {
        status = 'Partial';
      } else {
        status = 'Pending';
      }

      return {
        ...invoice,
        companyName: companies?.find(c => c.id === invoice.companyId)?.name || 'Unknown',
        totalPaid: totalReceivedWithAdvance,
        totalDeductions,
        taxableAmount,
        tdsAmount,
        balance: finalBalance,
        status,
      };
    });
  }, [invoices, companies, getPaymentDetails]);
  
  const availableYears = useMemo(() => {
    if (!processedInvoices) return [];
    const years = new Set(processedInvoices.filter(inv => inv.enterprise === activeTab).map(inv => {
        const dateString = inv.billingMonth ? `${inv.billingMonth}-01` : inv.billDate;
        return format(parseISO(dateString), 'yyyy');
    }));
    return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [processedInvoices, activeTab]);

  const availableMonths = useMemo(() => {
    if (yearFilter === 'All' || !processedInvoices) return [];
    const months = new Set(
      processedInvoices
        .filter(inv => {
            const dateString = inv.billingMonth ? `${inv.billingMonth}-01` : inv.billDate;
            return format(parseISO(dateString), 'yyyy') === yearFilter && inv.enterprise === activeTab;
        })
        .map(inv => inv.billingMonth || format(parseISO(inv.billDate), 'yyyy-MM'))
    );
    return ['All', ...Array.from(months).sort()];
  }, [processedInvoices, yearFilter, activeTab]);

  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter(invoice => {
      const enterpriseMatch = invoice.enterprise === activeTab;
      if (!enterpriseMatch) return false;

      const yearFromInvoice = invoice.billingMonth ? invoice.billingMonth.substring(0, 4) : format(parseISO(invoice.billDate), 'yyyy');
      const monthFromInvoice = invoice.billingMonth || format(parseISO(invoice.billDate), 'yyyy-MM');
      
      const yearMatch = yearFilter === 'All' || yearFromInvoice === yearFilter;
      const monthMatch = monthFilter === 'All' || monthFromInvoice === yearFilter; // Corrected filter logic

      const companyMatch = companyFilter === 'All' || invoice.companyId === companyFilter;
      const statusMatch = statusFilter === 'All' || invoice.status === statusFilter;
      
      const searchLower = searchFilter.toLowerCase();
      const searchMatch = searchFilter === '' ||
        invoice.billNo.toString().includes(searchLower) ||
        invoice.companyName.toLowerCase().includes(searchLower);

      return yearMatch && (monthFilter === 'All' || monthFromInvoice === monthFilter) && companyMatch && statusMatch && searchMatch;
    });
  }, [processedInvoices, activeTab, companyFilter, statusFilter, searchFilter, yearFilter, monthFilter]);
  
  const monthlyGroupedInvoices = useMemo(() => {
    if (!filteredInvoices) return [];

    const groups = filteredInvoices.reduce((acc, invoice) => {
      const monthKey = invoice.billingMonth || format(parseISO(invoice.billDate), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(invoice);
      return acc;
    }, {} as Record<string, ProcessedInvoice[]>);
    
    const sortedMonthKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b));

    return sortedMonthKeys.map(monthKey => ({
      monthKey,
      monthLabel: format(parseISO(`${monthKey}-01`), 'MMMM yyyy'),
      invoices: groups[monthKey],
    }));
  }, [filteredInvoices]);

  const summary = useMemo(() => {
      const totalBilled = filteredInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalPaid = filteredInvoices.reduce((acc, inv) => acc + inv.totalPaid, 0);
      const totalTds = filteredInvoices.reduce((acc, inv) => acc + inv.tdsAmount, 0);
      const totalPending = filteredInvoices.reduce((acc, inv) => acc + inv.balance, 0);
      return { totalBilled, totalPaid, totalTds, totalPending };
  }, [filteredInvoices]);

  const clearFilters = () => {
    setCompanyFilter('All');
    setStatusFilter('All');
    setSearchFilter('');
    setYearFilter('All');
    setMonthFilter('All');
  };
  
  const handleOpenPaymentDialog = (invoice: ProcessedInvoice) => {
    closeAllDialogs();
    setSelectedInvoiceForPayment(invoice);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setReceivedAmount('');
    setOtherDeductions('');
    setNotes('');
    setPaymentMode('RTGS');
    setChequeDetails('');
    setIsPaymentDialogOpen(true);
  };
  
  const handleOpenDetailsDialog = (invoice: ProcessedInvoice) => {
    closeAllDialogs();
    setInvoiceForDetails(invoice);
    setIsDetailsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  const handleAddPayment = () => {
    if (!firestore || !selectedInvoiceForPayment) return;

    const received = parseFloat(receivedAmount.replace(/,/g, '')) || 0;
    const newOtherDeductions = parseFloat(otherDeductions.replace(/,/g, '')) || 0;
    const trimmedNotes = notes.trim();

    if (received <= 0 && newOtherDeductions <= 0 && !trimmedNotes) {
        toast({
            variant: "destructive",
            title: "Invalid Entry",
            description: "Please enter an amount, deductions, or a note.",
        });
        return;
    }
    
    const totalPayment = received + newOtherDeductions;
    const currentRoundedBalance = selectedInvoiceForPayment.balance;

    if (totalPayment > 0 && totalPayment > currentRoundedBalance + 0.5) {
        toast({
            variant: "destructive",
            title: "Payment Exceeds Balance",
            description: `Payment of ${formatCurrency(totalPayment)} is more than the pending amount of ${formatCurrency(currentRoundedBalance)}.`,
        });
        return;
    }

    const paymentData: Omit<Payment, 'id'> = {
        invoiceId: selectedInvoiceForPayment.id,
        companyId: selectedInvoiceForPayment.companyId,
        paymentDate: paymentDate,
        receivedAmount: received,
        tdsDeducted: 0, 
        otherDeductions: newOtherDeductions,
        notes: trimmedNotes,
        createdAt: new Date().toISOString(),
        paymentMode: paymentMode,
        chequeDetails: paymentMode === 'CHEQUE' ? chequeDetails : '',
    };
    
    addDocumentNonBlocking(collection(firestore, 'payments'), paymentData);

    toast({
        title: "Entry Recorded",
        description: `An entry for Bill No. ${selectedInvoiceForPayment.billNo} has been recorded.`,
    });

    setIsPaymentDialogOpen(false);
}

  const handleTdsUpdate = (invoiceId: string, value: string) => {
    if (!firestore) return;
    const percentage = Number(value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
            variant: "destructive",
            title: "Invalid TDS %",
            description: "Please enter a number between 0 and 100.",
        });
        return;
    }
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    updateDocumentNonBlocking(invoiceRef, { tdsPercentage: percentage });
  }
  
  const handleDeletePayment = () => {
    if (!firestore || !paymentToDelete) return;
    const paymentDocRef = doc(firestore, 'payments', paymentToDelete.id);
    deleteDocumentNonBlocking(paymentDocRef);
    toast({
        title: "Payment Deleted",
        description: `The payment record has been successfully deleted.`,
    });
    setPaymentToDelete(null);
  }

  const getStatusBadge = (status: Omit<PaymentStatus, 'All'>) => {
    switch (status) {
      case 'Received':
        return <Badge className="bg-green-600/80 dark:bg-green-500/80 text-white text-[10px] sm:text-xs">Received</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-500/80 dark:bg-yellow-600/80 text-white text-[10px] sm:text-xs">Partial</Badge>;
      case 'Pending':
        return <Badge variant="destructive" className="text-[10px] sm:text-xs">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] sm:text-xs">{status}</Badge>;
    }
  }


  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Enterprise)} className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking</CardTitle>
              <CardDescription>Monitor and manage invoice payments.</CardDescription>
              <TabsList className="grid w-full grid-cols-2 mt-4">
                  <TabsTrigger value="Vithal">Vithal Enterprises</TabsTrigger>
                  <TabsTrigger value="RV">R.V Enterprises</TabsTrigger>
              </TabsList>
            </CardHeader>
          </Card>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
              <CardHeader className="pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-blue-700 dark:text-blue-300 uppercase">Total Billed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(summary.totalBilled)}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
              <CardHeader className="pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-green-700 dark:text-green-300 uppercase">Total Received</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(summary.totalPaid)}</div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800">
              <CardHeader className="pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-orange-700 dark:text-orange-300 uppercase">Total TDS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(summary.totalTds)}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
              <CardHeader className="pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-red-700 dark:text-red-300 uppercase">Total Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(summary.totalPending)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by Bill No. or Company..."
                        className="pl-8 w-full h-9"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                  </div>
                   <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year}>{year === 'All' ? 'All Years' : year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={monthFilter} onValueChange={setMonthFilter} disabled={yearFilter === 'All'}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {month === 'All' ? 'All Months' : format(parseISO(`${month}-01`), 'MMMM')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Companies</SelectItem>
                      {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus)}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto h-9">
                      <XCircle className="mr-2 h-4 w-4"/> Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-3 pt-0">
               <div className="px-4 md:px-1 py-2 text-[10px] sm:text-sm text-muted-foreground">
                {isLoading
                    ? 'Loading records...'
                    : `Showing ${filteredInvoices.length} of ${
                        processedInvoices.filter(inv => inv.enterprise === activeTab).length
                        } invoices.`}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Bill No.</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Total / Taxable</TableHead>
                      <TableHead className="text-center w-20 sm:w-28">TDS %</TableHead>
                      <TableHead className="text-right">TDS Amt</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right w-[80px] sm:w-[100px]"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">Loading payments...</TableCell>
                      </TableRow>
                    ) : monthlyGroupedInvoices.length > 0 ? (
                      monthlyGroupedInvoices.map(({ monthKey, monthLabel, invoices: monthInvoices }) => (
                        <React.Fragment key={monthKey}>
                          <TableRow className="border-b-0 hover:bg-transparent">
                            <TableCell colSpan={9} className="pt-6 sm:pt-10 pb-1">
                              <div className="relative">
                                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                      <div className="w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center">
                                      <span className="bg-background px-3 sm:px-4 text-[10px] sm:text-base font-bold uppercase tracking-wider text-muted-foreground">
                                          {monthLabel}
                                      </span>
                                  </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          {monthInvoices.map((invoice) => (
                             <TableRow key={invoice.id}>
                              <TableCell className="font-medium text-center p-2 text-xs sm:text-sm">{invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</TableCell>
                              <TableCell className="p-2">
                                <div className="font-medium truncate max-w-[120px] sm:max-w-[200px] text-xs sm:text-sm">{invoice.companyName}</div>
                                <div className="text-[10px] text-muted-foreground">{format(parseISO(invoice.billDate), 'dd-MMM-yyyy')}</div>
                              </TableCell>
                              <TableCell className="text-right p-2 text-xs">
                                <div className="text-[10px] text-muted-foreground">{formatCurrency(invoice.taxableAmount)}</div>
                                <div className="font-bold">{formatCurrency(invoice.grandTotal)}</div>
                              </TableCell>
                              <TableCell className="text-center p-1">
                                <Input
                                  type="number"
                                  defaultValue={invoice.tdsPercentage || ''}
                                  onBlur={(e) => handleTdsUpdate(invoice.id, e.target.value)}
                                  className="h-7 w-12 sm:w-16 text-center mx-auto text-xs"
                                  placeholder="%"
                                />
                              </TableCell>
                              <TableCell className={cn("text-right p-2 text-xs font-medium text-red-600 dark:text-red-400", invoice.tdsAmount === 0 && "opacity-50")}>{formatCurrency(invoice.tdsAmount)}</TableCell>
                              <TableCell className="text-right p-2 text-xs font-medium text-green-600 dark:text-green-400">{formatCurrency(invoice.totalPaid)}</TableCell>
                              <TableCell className={cn("text-right p-2 text-xs font-bold text-orange-600 dark:text-orange-400", invoice.balance === 0 && "opacity-50")}>{formatCurrency(invoice.balance)}</TableCell>
                              <TableCell className="text-center p-2">{getStatusBadge(invoice.status)}</TableCell>
                              <TableCell className="text-right p-2">
                                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                                      <Button variant="outline" size="icon" onClick={() => handleOpenDetailsDialog(invoice)} className="h-7 w-7 sm:h-8 sm:w-8">
                                          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          <span className="sr-only">View</span>
                                      </Button>
                                      <Button variant="outline" size="icon" onClick={() => handleOpenPaymentDialog(invoice)} className="h-7 w-7 sm:h-8 sm:w-8">
                                          <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          <span className="sr-only">Add</span>
                                      </Button>
                                  </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">No matching invoices found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Tabs>
        
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Bill No. {selectedInvoiceForPayment?.billNo} to {selectedInvoiceForPayment?.companyName}. <br/>
                        <span className="font-bold">Pending: {formatCurrency(selectedInvoiceForPayment?.balance || 0)}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="paymentDate" className="text-right text-xs">Date</Label>
                        <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="col-span-3 h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="paymentMode" className="text-right text-xs">Mode</Label>
                        <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
                            <SelectTrigger className="col-span-3 h-9 text-sm">
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RTGS">RTGS</SelectItem>
                                <SelectItem value="NEFT">NEFT</SelectItem>
                                <SelectItem value="IMPS">IMPS</SelectItem>
                                <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                                <SelectItem value="CASH">CASH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {paymentMode === 'CHEQUE' && (
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="chequeDetails" className="text-right text-xs">Details</Label>
                            <Input id="chequeDetails" value={chequeDetails} onChange={(e) => setChequeDetails(e.target.value)} className="col-span-3 h-9 text-sm" placeholder="No., bank" />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="receivedAmount" className="text-right text-xs">Amount</Label>
                        <Input id="receivedAmount" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} className="col-span-3 h-9 text-sm" placeholder="e.g., 50000" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="otherDeductions" className="text-right text-xs">Deductions</Label>
                        <Input id="otherDeductions" value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} className="col-span-3 h-9 text-sm" placeholder="e.g., 20" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-3">
                        <Label htmlFor="notes" className="text-right text-xs mt-2">Notes</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3 text-sm min-h-[60px]" placeholder="Optional notes" />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="h-9">Cancel</Button>
                    <Button onClick={handleAddPayment} className="h-9">Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => { if (!open) closeAllDialogs()}}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Payment History</DialogTitle>
                    <DialogDescription>
                        Bill No. {invoiceForDetails?.billNo}-{invoiceForDetails?.billNoSuffix || 'MHE'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2 max-h-[50vh] overflow-y-auto">
                    {invoiceForDetails ? (
                        (() => {
                            const invoicePayments = payments?.filter(p => p.invoiceId === invoiceForDetails.id) || [];
                            const hasAdvance = invoiceForDetails.advanceReceived && invoiceForDetails.advanceReceived > 0;
                            
                            if (invoicePayments.length === 0 && !hasAdvance) {
                                return <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No records found.</p>;
                            }

                            return (
                                <div className="space-y-3 sm:space-y-4">
                                    {hasAdvance && (
                                        <div className="p-3 rounded-md border bg-muted/50 dark:bg-muted/20">
                                            <h4 className="text-xs sm:text-sm font-semibold mb-1">Advance Payment</h4>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">Amount:</span>
                                                <span className="font-medium">{formatCurrency(invoiceForDetails.advanceReceived!)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {invoicePayments.length > 0 && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="p-2 h-8 text-[10px] sm:text-xs">Date</TableHead>
                                                    <TableHead className="p-2 h-8 text-[10px] sm:text-xs">Mode</TableHead>
                                                    <TableHead className="p-2 h-8 text-right text-[10px] sm:text-xs">Amount</TableHead>
                                                    <TableHead className="p-2 h-8 text-right text-[10px] sm:text-xs">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {invoicePayments.map(payment => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell className="p-2 text-[10px] sm:text-xs">{format(parseISO(payment.paymentDate), 'dd-MMM-yy')}</TableCell>
                                                         <TableCell className="p-2 text-[10px] sm:text-xs">
                                                            <div className="font-medium">{payment.paymentMode}</div>
                                                        </TableCell>
                                                        <TableCell className="p-2 text-right text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400">{formatCurrency(payment.receivedAmount)}</TableCell>
                                                        <TableCell className="p-2 text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setPaymentToDelete(payment)} className="h-6 w-6">
                                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            )
                        })()
                    ) : (
                        <p className="text-center py-4">Loading details...</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)} className="h-9">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!paymentToDelete} onOpenChange={(open) => { if (!open) setPaymentToDelete(null); }}>
            <DialogContent className="max-w-[90vw] sm:max-w-md p-4">
                <DialogHeader>
                    <DialogTitle>Delete Payment?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setPaymentToDelete(null)} className="h-9">Cancel</Button>
                    <Button variant="destructive" onClick={handleDeletePayment} className="h-9">Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
