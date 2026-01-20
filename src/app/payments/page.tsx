
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
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { PlusCircle, Search, XCircle } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Invoice, Company, Payment } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";


type Enterprise = 'Vithal' | 'RV';
type PaymentStatus = 'All' | 'Paid' | 'Partial' | 'Pending';
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
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc')) : null, [firestore]);

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies || isLoadingPayments;

  // Filters
  const [activeTab, setActiveTab] = useState<Enterprise>('Vithal');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Payment Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<ProcessedInvoice | null>(null);

  // Payment Form State
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivedAmount, setReceivedAmount] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [notes, setNotes] = useState('');


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
      
      const tdsPercentage = invoice.tdsPercentage || 0;
      const tdsAmount = (invoice.grandTotal * tdsPercentage) / 100;
      const netReceivable = invoice.grandTotal - tdsAmount;
      
      const totalCredited = totalPaid + totalDeductions + (invoice.advanceReceived || 0);
      const balance = netReceivable - totalCredited;

      let status: Omit<PaymentStatus, 'All'>;
      if (balance <= 0.01) { // Use a small epsilon for float comparison
        status = 'Paid';
      } else if (totalCredited > 0 && balance > 0) {
        status = 'Partial';
      } else {
        status = 'Pending';
      }

      return {
        ...invoice,
        companyName: companies?.find(c => c.id === invoice.companyId)?.name || 'Unknown',
        totalPaid: totalPaid + (invoice.advanceReceived || 0),
        totalDeductions,
        tdsAmount,
        balance,
        status,
      };
    });
  }, [invoices, companies, getPaymentDetails]);

  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter(invoice => {
      const enterpriseMatch = invoice.enterprise === activeTab;
      if (!enterpriseMatch) return false;

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
  }, [processedInvoices, activeTab, companyFilter, statusFilter, dateRangeFilter, searchFilter]);
  
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
    setDateRangeFilter(undefined);
    setSearchFilter('');
  };
  
  const handleOpenPaymentDialog = (invoice: ProcessedInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setReceivedAmount('');
    setOtherDeductions('');
    setNotes('');
    setIsPaymentDialogOpen(true);
  };
  
  const handleAddPayment = () => {
      if (!firestore || !selectedInvoiceForPayment) return;

      const received = parseFloat(receivedAmount.replace(/,/g, '')) || 0;

      if (received <= 0) {
          toast({
              variant: "destructive",
              title: "Invalid Amount",
              description: "Received amount must be greater than zero.",
          });
          return;
      }

      const paymentData: Omit<Payment, 'id'> = {
          invoiceId: selectedInvoiceForPayment.id,
          companyId: selectedInvoiceForPayment.companyId,
          paymentDate: paymentDate,
          receivedAmount: received,
          tdsDeducted: 0, // This is now calculated at the invoice level
          otherDeductions: parseFloat(otherDeductions.replace(/,/g, '')) || 0,
          notes: notes,
          createdAt: new Date().toISOString(),
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
                    <TableHead className="text-center w-28">TDS %</TableHead>
                    <TableHead className="text-right">TDS Amount</TableHead>
                    <TableHead className="text-right">Amount Received</TableHead>
                    <TableHead className="text-right">Deducted</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">Loading payments...</TableCell>
                    </TableRow>
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</TableCell>
                        <TableCell>{invoice.companyName}</TableCell>
                        <TableCell>{format(parseISO(invoice.billDate), 'dd-MM-yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.grandTotal)}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            defaultValue={invoice.tdsPercentage || ''}
                            onBlur={(e) => handleTdsUpdate(invoice.id, e.target.value)}
                            className="h-8 w-20 text-center mx-auto"
                            placeholder="%"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.tdsAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.totalPaid)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.totalDeductions)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(invoice.balance)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleOpenPaymentDialog(invoice)}>
                              <PlusCircle className="mr-2 h-3.5 w-3.5"/> Add
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">No matching invoices found.</TableCell>
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
      </div>
    </AppLayout>
  );
}
