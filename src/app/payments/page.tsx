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
import { PlusCircle, Search, XCircle, Info } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Invoice, Company, Payment } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";


type Enterprise = 'Vithal' | 'RV';
type PaymentStatus = 'All' | 'Paid' | 'Partial' | 'Pending';
type PaymentMode = 'RTGS' | 'NEFT' | 'IMPS' | 'CHEQUE' | 'CASH';

type ProcessedInvoice = Invoice & {
    companyName: string;
    totalPaid: number;
    totalDeductions: number;
    tdsAmount: number;
    balance: number;
    status: Omit<PaymentStatus, 'All'>;
};


export default function PaymentsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Data fetching
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billNo', 'asc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc')) : null, [firestore]);

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies || isLoadingPayments;

  // Filters
  const [activeTab, setActiveTab] = useState<Enterprise>('Vithal');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('All');
  const [searchFilter, setSearchFilter] = useState('');
  
  // New state for year and month filters
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');

  // Dialog States
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<ProcessedInvoice | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [invoiceForDetails, setInvoiceForDetails] = useState<ProcessedInvoice | null>(null);


  // Payment Form State
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivedAmount, setReceivedAmount] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('RTGS');
  const [chequeDetails, setChequeDetails] = useState('');


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
      if (roundedBalance <= 0) {
        status = 'Paid';
      } else if (totalCredited > 0 && rawBalance > 0) {
        status = 'Partial';
      } else {
        status = 'Pending';
      }

      return {
        ...invoice,
        companyName: companies?.find(c => c.id === invoice.companyId)?.name || 'Unknown',
        totalPaid: totalReceivedWithAdvance,
        totalDeductions,
        tdsAmount,
        balance: roundedBalance,
        status,
      };
    });
  }, [invoices, companies, getPaymentDetails]);

  const availableYears = useMemo(() => {
    if (!processedInvoices) return [];
    const years = new Set(processedInvoices.map(inv => format(parseISO(inv.billDate), 'yyyy')));
    return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [processedInvoices]);

  const availableMonths = [
      { value: 'All', label: 'All Months' },
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' },
  ];

  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter(invoice => {
      const enterpriseMatch = invoice.enterprise === activeTab;
      if (!enterpriseMatch) return false;

      const companyMatch = companyFilter === 'All' || invoice.companyId === companyFilter;
      const statusMatch = statusFilter === 'All' || invoice.status === statusFilter;
      
      const date = parseISO(invoice.billDate);
      const yearMatch = yearFilter === 'All' || format(date, 'yyyy') === yearFilter;
      const monthMatch = monthFilter === 'All' || format(date, 'MM') === monthFilter;

      const searchLower = searchFilter.toLowerCase();
      const searchMatch = searchFilter === '' ||
        invoice.billNo.toString().includes(searchLower) ||
        invoice.companyName.toLowerCase().includes(searchLower);

      return companyMatch && statusMatch && yearMatch && monthMatch && searchMatch;
    });
  }, [processedInvoices, activeTab, companyFilter, statusFilter, yearFilter, monthFilter, searchFilter]);
  
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
    setYearFilter('All');
    setMonthFilter('All');
    setSearchFilter('');
  };
  
  const handleOpenPaymentDialog = (invoice: ProcessedInvoice) => {
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
      const totalPayment = received + newOtherDeductions;

      if (totalPayment <= 0) {
          toast({
              variant: "destructive",
              title: "Invalid Amount",
              description: "Total payment (Received + Deductions) must be greater than zero.",
          });
          return;
      }
      
      const originalInvoice = invoices?.find(inv => inv.id === selectedInvoiceForPayment.id);
      if (!originalInvoice) {
          toast({ variant: "destructive", title: "Error", description: "Could not find original invoice." });
          return;
      }
      const { totalPaid, totalDeductions } = getPaymentDetails(originalInvoice.id);
      
      const taxableAmount = originalInvoice.discountType === 'before_gst' 
        ? originalInvoice.netTotal - (originalInvoice.discount || 0) 
        : originalInvoice.netTotal;
      const tdsPercentage = originalInvoice.tdsPercentage || 0;
      const tdsAmount = (taxableAmount * tdsPercentage) / 100;
      
      const totalReceivedWithAdvance = totalPaid + (originalInvoice.advanceReceived || 0);
      const totalCredited = totalReceivedWithAdvance + totalDeductions;
      const currentRawBalance = originalInvoice.grandTotal - totalCredited - tdsAmount;


      if (totalPayment > currentRawBalance + 0.01) {
          toast({
              variant: "destructive",
              title: "Payment Exceeds Balance",
              description: `Payment of ${formatCurrency(totalPayment)} is more than the pending amount of ${formatCurrency(currentRawBalance)}.`,
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
          notes: notes,
          createdAt: new Date().toISOString(),
          paymentMode: paymentMode,
          chequeDetails: paymentMode === 'CHEQUE' ? chequeDetails : '',
      };
      
      addDocumentNonBlocking(collection(firestore, 'payments'), paymentData);

      toast({
          title: "Payment Recorded",
          description: `Payment for Bill No. ${selectedInvoiceForPayment.billNo} has been recorded.`,
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Enterprise)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking & Reconciliation</CardTitle>
              <CardDescription>Monitor and manage invoice payments.</CardDescription>
              <TabsList className="grid w-full grid-cols-2 mt-4">
                  <TabsTrigger value="Vithal">Vithal Enterprises</TabsTrigger>
                  <TabsTrigger value="RV">R.V Enterprises</TabsTrigger>
              </TabsList>
            </CardHeader>
          </Card>

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
                <div className="text-2xl font-bold text-green-900 dark:text-green-200">{formatCurrency(summary.totalPaid)}</div>
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

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
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
                  <div className='flex gap-2'>
                    <div className="space-y-2">
                      <Label htmlFor="year-filter" className="sr-only">Year</Label>
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                          <SelectTrigger id="year-filter" className="w-full sm:w-[120px]">
                              <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                              {availableYears.map(year => (
                                  <SelectItem key={year} value={year}>{year}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month-filter" className="sr-only">Month</Label>
                      <Select value={monthFilter} onValueChange={setMonthFilter}>
                          <SelectTrigger id="month-filter" className="w-full sm:w-[150px]">
                              <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                              {availableMonths.map(month => (
                                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-center w-28">TDS %</TableHead>
                    <TableHead className="text-right">TDS Amount</TableHead>
                    <TableHead className="text-right">Amount Received</TableHead>
                    <TableHead className="text-right">Deducted</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right w-[100px]"><span className="sr-only">Actions</span></TableHead>
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
                        <TableCell className="font-medium">{invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[200px]">{invoice.companyName}</div>
                          <div className="text-sm text-muted-foreground">{format(parseISO(invoice.billDate), 'dd-MMM-yyyy')}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.grandTotal)}</TableCell>
                        <TableCell className="text-center p-1">
                          <Input
                            type="number"
                            defaultValue={invoice.tdsPercentage || ''}
                            onBlur={(e) => handleTdsUpdate(invoice.id, e.target.value)}
                            className="h-8 w-16 text-center mx-auto"
                            placeholder="%"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-500">{formatCurrency(invoice.tdsAmount)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-500">{formatCurrency(invoice.totalPaid)}</TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-500">{formatCurrency(invoice.totalDeductions)}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600 dark:text-orange-500">{formatCurrency(invoice.balance)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleOpenDetailsDialog(invoice)} className="h-8 w-8">
                                    <Info className="h-4 w-4" />
                                    <span className="sr-only">View Payment History</span>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleOpenPaymentDialog(invoice)} className="h-8 w-8">
                                    <PlusCircle className="h-4 w-4" />
                                    <span className="sr-only">Add Payment</span>
                                </Button>
                            </div>
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
        </Tabs>
        
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Record a payment for Bill No. {selectedInvoiceForPayment?.billNo} to {selectedInvoiceForPayment?.companyName}. <br/>
                        <span className="font-bold">Amount Due: {formatCurrency(selectedInvoiceForPayment?.balance || 0)}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentDate" className="text-right">Payment Date</Label>
                        <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentMode" className="text-right">Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
                            <SelectTrigger className="col-span-3">
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="chequeDetails" className="text-right">Cheque Details</Label>
                            <Input id="chequeDetails" value={chequeDetails} onChange={(e) => setChequeDetails(e.target.value)} className="col-span-3" placeholder="Cheque no., date, bank" />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="receivedAmount" className="text-right">Amount Received</Label>
                        <Input id="receivedAmount" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} className="col-span-3" placeholder="e.g., 50000" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="otherDeductions" className="text-right">Other Deductions</Label>
                        <Input id="otherDeductions" value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} className="col-span-3" placeholder="e.g., 20" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">Notes</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" placeholder="Optional notes about the payment" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddPayment}>Save Payment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payment History</DialogTitle>
                    <DialogDescription>
                        Detailed payment history for Bill No. {invoiceForDetails?.billNo}-{invoiceForDetails?.billNoSuffix || 'MHE'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    {invoiceForDetails ? (
                        (() => {
                            const invoicePayments = payments?.filter(p => p.invoiceId === invoiceForDetails.id) || [];
                            const hasAdvance = invoiceForDetails.advanceReceived && invoiceForDetails.advanceReceived > 0;
                            return (
                                <div className="space-y-4">
                                    {hasAdvance && (
                                        <div className="p-3 rounded-md border bg-muted/50">
                                            <h4 className="font-semibold mb-2">Advance Payment</h4>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Amount:</span>
                                                <span className="font-medium">{formatCurrency(invoiceForDetails.advanceReceived!)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Note:</span>
                                                <span className="font-medium">Received with invoice</span>
                                            </div>
                                        </div>
                                    )}
                                    {invoicePayments.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Mode</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                    <TableHead className="text-right">Deductions</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {invoicePayments.map(payment => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{format(parseISO(payment.paymentDate), 'dd-MMM-yyyy')}</TableCell>
                                                         <TableCell>
                                                            <div className="font-medium">{payment.paymentMode}</div>
                                                            {payment.paymentMode === 'CHEQUE' && payment.chequeDetails && (
                                                                <div className="text-xs text-muted-foreground">{payment.chequeDetails}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">{payment.notes || '-'}</TableCell>
                                                        <TableCell className="text-right text-red-600">{formatCurrency(payment.otherDeductions || 0)}</TableCell>
                                                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(payment.receivedAmount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        !hasAdvance && <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet for this invoice.</p>
                                    )}
                                </div>
                            )
                        })()
                    ) : (
                        <p>Loading details...</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
