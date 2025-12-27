'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, addDoc, doc } from 'firebase/firestore';
import { Company, Invoice } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Plus, Trash2, Printer, MoreHorizontal, Pencil, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { InvoiceTemplate, type InvoiceData } from '@/components/invoice-template';
import { useReactToPrint } from 'react-to-print';
import { ToWords } from 'to-words';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function BillingPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const initialFormState = {
    companyId: '',
    billDate: new Date(),
    poNumber: 'AGREEMENT',
    site: '',
    items: [{ particulars: '', amount: 0 }],
  };

  const [companyId, setCompanyId] = useState<string>('');
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = useState(false);
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [poNumber, setPoNumber] = useState('AGREEMENT');
  const [site, setSite] = useState('');
  const [items, setItems] = useState([{ particulars: '', amount: 0 }]);
  
  const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceData | null>(null);
  
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Queries
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const lastInvoiceQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billNo', 'desc'), limit(1)) : null, [firestore]);
  const allInvoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);

  // Data
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: lastInvoiceArr } = useCollection<Invoice>(lastInvoiceQuery);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(allInvoicesQuery);

  const nextBillNo = useMemo(() => {
    if (editingInvoice) return editingInvoice.billNo;
    if (lastInvoiceArr && lastInvoiceArr.length > 0) {
      const maxBillNo = allInvoices ? Math.max(...allInvoices.map(inv => inv.billNo)) : 0;
      return maxBillNo >= (lastInvoiceArr[0].billNo || 0) ? maxBillNo + 1 : (lastInvoiceArr[0].billNo || 0) + 1;
    }
    return 1;
  }, [lastInvoiceArr, editingInvoice, allInvoices]);
  
  const selectedCompany = useMemo(() => companies?.find(c => c.id === companyId), [companies, companyId]);

  const calculations = useMemo(() => {
    const netTotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const cgst = netTotal * 0.09;
    const sgst = netTotal * 0.09;
    const grandTotal = netTotal + cgst + sgst;
    return { netTotal, cgst, sgst, grandTotal };
  }, [items]);
  
  const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: true,
      ignoreZeroCurrency: false,
    }
  });

  const handleAddItem = () => {
    setItems([...items, { particulars: '', amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: 'particulars' | 'amount', value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };
  
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${invoiceToPrint?.billNo || nextBillNo}`,
    onAfterPrint: () => setInvoiceToPrint(null),
  });
  
  const amountInWords = useMemo(() => {
    return toWords.convert(calculations.grandTotal) + ' Only';
  },[calculations.grandTotal, toWords]);
  
  const generateInvoiceData = (invoice: Omit<Invoice, 'id'>, company: Company): InvoiceData => {
     const words = new ToWords({
        localeCode: 'en-IN',
        converterOptions: {
          currency: true,
          ignoreDecimal: true,
          ignoreZeroCurrency: false,
        }
      });
      const grandTotalInWords = words.convert(invoice.grandTotal) + ' Only';
      
      return {
          to: {
            name: company.name,
            address: company.address,
            gstin: company.gstin || '',
          },
          billDate: format(new Date(invoice.billDate), 'dd/MM/yyyy'),
          billNo: `${invoice.billNo}-${invoice.billNoSuffix || 'MHE'}`,
          poNo: invoice.poNumber || 'AGREEMENT',
          month: format(new Date(invoice.billDate), 'MMM yyyy').toUpperCase(),
          site: invoice.site || '',
          items: invoice.items,
          netTotal: invoice.netTotal,
          cgst: invoice.cgst,
          sgst: invoice.sgst,
          grandTotal: invoice.grandTotal,
          amountInWords: grandTotalInWords,
      }
  }
  
  const resetForm = () => {
      setCompanyId(initialFormState.companyId);
      setBillDate(initialFormState.billDate);
      setPoNumber(initialFormState.poNumber);
      setSite(initialFormState.site);
      setItems(initialFormState.items);
      setEditingInvoice(null);
  };

  const handleFormSubmit = async () => {
    if (!companyId || !billDate || !site || !selectedCompany || items.some(i => !i.particulars || i.amount <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a company, date, site and fill all invoice items.',
      });
      return;
    }
    
    if (firestore) {
      const invoiceData: Omit<Invoice, 'id'> = {
        billNo: nextBillNo,
        billNoSuffix: 'MHE',
        billDate: format(billDate, 'yyyy-MM-dd'),
        companyId,
        poNumber,
        site,
        items,
        netTotal: calculations.netTotal,
        cgst: calculations.cgst,
        sgst: calculations.sgst,
        grandTotal: calculations.grandTotal,
      };

      try {
          if (editingInvoice) {
            // Update existing invoice
            const invoiceDocRef = doc(firestore, 'invoices', editingInvoice.id);
            updateDocumentNonBlocking(invoiceDocRef, invoiceData);
            toast({
                title: 'Invoice Updated',
                description: `Invoice No. ${invoiceData.billNo}-MHE has been updated.`,
            });
          } else {
            // Add new invoice
            await addDoc(collection(firestore, 'invoices'), invoiceData);
            toast({
                title: 'Invoice Saved',
                description: `Invoice No. ${nextBillNo}-MHE has been saved.`,
            });
          }

        const printableData = generateInvoiceData(invoiceData, selectedCompany);
        setInvoiceToPrint(printableData);
        resetForm();
        
      } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Save Error',
            description: 'Could not save the invoice. Please try again.',
        });
      }
    }
  };
  
  const handleReprint = (invoice: Invoice) => {
    const company = companies?.find(c => c.id === invoice.companyId);
    if (company) {
        const printableData = generateInvoiceData(invoice, company);
        setInvoiceToPrint(printableData);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find company details for this invoice.' });
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setCompanyId(invoice.companyId);
    // The date from firestore is a string, so we create a new Date object from it.
    // The date is in YYYY-MM-DD format, which JS new Date() parses as UTC.
    // To avoid timezone issues, we can parse it as ISO string to keep it consistent.
    const date = parseISO(invoice.billDate);
    setBillDate(date);
    setPoNumber(invoice.poNumber || 'AGREEMENT');
    setSite(invoice.site || '');
    setItems(invoice.items);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const openDeleteDialog = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteInvoice = () => {
      if (!firestore || !invoiceToDelete) return;
      const invoiceDocRef = doc(firestore, 'invoices', invoiceToDelete.id);
      deleteDocumentNonBlocking(invoiceDocRef);
      toast({
          title: "Invoice Deleted",
          description: `Invoice No. ${invoiceToDelete.billNo}-MHE has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
  };

  // Trigger print when invoiceToPrint is set
  useEffect(() => {
    if (invoiceToPrint) {
        handlePrint();
    }
  }, [invoiceToPrint, handlePrint]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{editingInvoice ? 'Edit Invoice' : 'Generate Monthly Invoice'}</CardTitle>
                <CardDescription>{editingInvoice ? `Updating Invoice No. ${editingInvoice.billNo}-MHE` : 'Fill the details below to create a new invoice.'}</CardDescription>
              </div>
              {editingInvoice && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Selection */}
              <div className="space-y-2">
                <Label htmlFor="company">Bill To</Label>
                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="company"
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCompanyPopoverOpen}
                      className="w-full justify-between"
                      disabled={isLoadingCompanies}
                    >
                      <span className="truncate">{selectedCompany ? selectedCompany.name : "Select company..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search company..." />
                      <CommandList>
                        <CommandEmpty>No company found. Add one on the Companies page.</CommandEmpty>
                        <CommandGroup>
                          {companies?.map((company) => (
                            <CommandItem
                              key={company.id}
                              value={company.name}
                              onSelect={() => {
                                setCompanyId(company.id);
                                setIsCompanyPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", companyId === company.id ? "opacity-100" : "opacity-0")} />
                              {company.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Bill Date */}
              <div className="space-y-2">
                <Label htmlFor="billDate">Bill Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !billDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={billDate} onSelect={setBillDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              
               {/* Site */}
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Input id="site" value={site} onChange={e => setSite(e.target.value)} placeholder="e.g., THANE DEPOT" />
              </div>
              
              {/* PO Number */}
              <div className="space-y-2">
                <Label htmlFor="poNumber">PO.NO</Label>
                <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <Label>Particulars</Label>
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Item description"
                    value={item.particulars}
                    onChange={(e) => handleItemChange(index, 'particulars', e.target.value)}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={item.amount || ''}
                    onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value))}
                    className="w-48"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            
            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2">
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Total</span>
                  <span>{calculations.netTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST @ 9%</span>
                   <span>{calculations.cgst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST @ 9%</span>
                   <span>{calculations.sgst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total</span>
                   <span>{calculations.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <div className="text-sm text-muted-foreground pt-1">
                  In words: <span className="font-medium text-foreground">{amountInWords}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleFormSubmit} size="lg">
                 {editingInvoice ? 'Update Invoice' : 'Generate & Save Invoice'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>View, edit, and re-print previously generated invoices.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bill No.</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Bill Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingInvoices ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">Loading invoices...</TableCell>
                            </TableRow>
                        ) : allInvoices && allInvoices.length > 0 ? (
                           allInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</TableCell>
                                    <TableCell>{companies?.find(c => c.id === invoice.companyId)?.name || 'Unknown'}</TableCell>
                                    <TableCell>{format(parseISO(invoice.billDate), 'dd MMM, yyyy')}</TableCell>
                                    <TableCell className="text-right">{invoice.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu open={openDropdownId === invoice.id} onOpenChange={(open) => setOpenDropdownId(open ? invoice.id : null)}>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => handleReprint(invoice)}>
                                                    <Printer className="mr-2 h-4 w-4" />
                                                    Print
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleEdit(invoice)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => openDeleteDialog(invoice)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                           ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No invoices found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        {/* Hidden Invoice for printing */}
        <div className="absolute -z-10 -left-[9999px] -top-[9999px]">
            {invoiceToPrint && <InvoiceTemplate ref={invoiceRef} data={invoiceToPrint} />}
        </div>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete Invoice No. <span className="font-medium">{invoiceToDelete?.billNo}-MHE</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setInvoiceToDelete(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      </div>
    </AppLayout>
  );
}
