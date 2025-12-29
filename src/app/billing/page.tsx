
'use client';
import { useState, useMemo, useEffect } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Company, Invoice, InvoiceItem } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, PlusCircle, EllipsisVertical, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateAndDownloadInvoice } from '@/lib/invoice-generator';


export default function BillingPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const toISODateString = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  }

  const initialFormState = {
    companyId: '',
    billDate: toISODateString(new Date()),
    poNumber: 'AGREEMENT',
    site: '',
    items: [{ particulars: '', rate: '', amount: 0 }],
  };

  const [companyId, setCompanyId] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(toISODateString(new Date()));
  const [poNumber, setPoNumber] = useState('AGREEMENT');
  const [site, setSite] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>(initialFormState.items);
    
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  const [invoiceStartNumber, setInvoiceStartNumber] = useState('');


  // Queries
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const allInvoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);

  // Data
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(allInvoicesQuery);

  const selectedCompany = useMemo(() => companies?.find(c => c.id === companyId), [companies, companyId]);
  
  const maxBillNumber = useMemo(() => {
    if (!allInvoices || allInvoices.length === 0) return 0;
    return Math.max(0, ...allInvoices.map(inv => inv.billNo));
  }, [allInvoices]);
  
  useEffect(() => {
    if (maxBillNumber > 0 && !invoiceStartNumber) {
        setInvoiceStartNumber((maxBillNumber + 1).toString());
    }
   }, [maxBillNumber, invoiceStartNumber]);

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
    setItems([...items, { particulars: '', rate: '', amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };
  
  const handleDownloadWord = async (invoice: Invoice) => {
    const company = companies?.find(c => c.id === invoice.companyId);
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find company details.' });
      return;
    }
    
    try {
        await generateAndDownloadInvoice(invoice, company);
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Download Error',
            description: 'Could not generate Word document.',
        });
        console.error(e);
    }
  };
  
  const amountInWords = useMemo(() => {
    return toWords.convert(calculations.grandTotal);
  },[calculations.grandTotal, toWords]);
  
  
  const resetForm = () => {
      setCompanyId(initialFormState.companyId);
      setBillDate(initialFormState.billDate);
      setPoNumber(initialFormState.poNumber);
      setSite(initialFormState.site);
      setItems(initialFormState.items);
      setEditingInvoice(null);
  };

  const handleFormSubmit = async () => {
    if (!companyId || !billDate || !selectedCompany || items.some(i => !i.particulars || i.amount <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a company, date, and fill all invoice items with an amount.',
      });
      return;
    }
    
    if (firestore) {
      let billNoToUse = editingInvoice ? editingInvoice.billNo : (Number(invoiceStartNumber) > maxBillNumber ? Number(invoiceStartNumber) : maxBillNumber + 1);

      if (isNaN(billNoToUse)) {
        billNoToUse = maxBillNumber + 1;
      }
      
      const invoiceData: Omit<Invoice, 'id'> = {
        billNo: billNoToUse,
        billNoSuffix: 'MHE',
        billDate: billDate,
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
          const invoiceDocRef = doc(firestore, 'invoices', editingInvoice.id);
          updateDocumentNonBlocking(invoiceDocRef, invoiceData);
          toast({
              title: 'Invoice Updated',
              description: `Invoice No. ${invoiceData.billNo}-MHE has been updated.`,
          });
        } else {
          addDocumentNonBlocking(collection(firestore, 'invoices'), invoiceData);
          setInvoiceStartNumber((billNoToUse + 1).toString());
          toast({
              title: 'Invoice Saved',
              description: `Invoice No. ${billNoToUse}-MHE has been saved.`,
          });
        }
        setIsFormDialogOpen(false);
        
      } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Save Error',
            description: 'Could not save the invoice. Please try again.',
        });
      }
    }
  };
  
  const handleOpenFormDialog = (invoice: Invoice | null) => {
    setInvoiceToDelete(null);
    if (invoice) {
      setEditingInvoice(invoice);
      setCompanyId(invoice.companyId);
      setBillDate(invoice.billDate);
      setPoNumber(invoice.poNumber || 'AGREEMENT');
      setSite(invoice.site || '');
      setItems(invoice.items.map(item => ({ ...item, rate: item.rate ?? '' }))); // Ensure rate is a string
      setTimeout(() => {
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      resetForm();
      setEditingInvoice(null);
    }
    setIsFormDialogOpen(true);
  };
  
  const handleDeleteInvoice = () => {
    if (!firestore || !invoiceToDelete) return;
    const invoiceDocRef = doc(firestore, 'invoices', invoiceToDelete.id);
    deleteDocumentNonBlocking(invoiceDocRef);
    toast({
        title: "Invoice Deleted",
        description: `Invoice No. ${invoiceToDelete.billNo}-MHE has been deleted.`,
    });
    setInvoiceToDelete(null);
  };
  
  const handleStartNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // only allow numbers
        setInvoiceStartNumber(value);
    }
  };
  
  const handleUpdateStartNumber = () => {
      const num = parseInt(invoiceStartNumber, 10);
      if (isNaN(num) || num <= maxBillNumber) {
          toast({
              variant: 'destructive',
              title: 'Invalid Number',
              description: `Start number must be a number greater than the current max bill no (${maxBillNumber}).`
          })
          setInvoiceStartNumber((maxBillNumber + 1).toString());
      } else {
          toast({
              title: 'Success',
              description: `Next invoice will start from ${num}.`
          })
      }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>View, edit, and create new invoices.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenFormDialog(null)} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Invoice
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/40">
                    <div className="flex-1 w-full sm:w-auto">
                        <Label htmlFor="invoiceStart" className="text-sm font-medium">Next Invoice Number</Label>
                        <p className="text-xs text-muted-foreground">Set the number for the next invoice to be generated.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                            id="invoiceStart"
                            type="text"
                            value={invoiceStartNumber}
                            onChange={handleStartNumberChange}
                            className="w-full sm:w-32"
                            disabled={isLoadingInvoices}
                            placeholder={isLoadingInvoices ? "Loading..." : (maxBillNumber + 1).toString()}
                        />
                        <Button onClick={handleUpdateStartNumber} disabled={isLoadingInvoices}>Update</Button>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bill No.</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Bill Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <EllipsisVertical className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-40">
                                                <div className="grid gap-1">
                                                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleDownloadWord(invoice)}>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleOpenFormDialog(invoice)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setInvoiceToDelete(invoice)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
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

        <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
            setIsFormDialogOpen(isOpen);
            if (!isOpen) {
                setEditingInvoice(null);
                resetForm();
            }
        }}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Generate New Invoice'}</DialogTitle>
                    <DialogDescription>{editingInvoice ? `Updating Invoice No. ${editingInvoice.billNo}-MHE` : 'Fill the details below to create a new invoice.'}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto px-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="company">Bill To</Label>
                                <Select value={companyId} onValueChange={setCompanyId} disabled={isLoadingCompanies}>
                                    <SelectTrigger id="company" className="w-full">
                                        <SelectValue placeholder="Select a company..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingCompanies ? (
                                            <SelectItem value="loading" disabled>Loading companies...</SelectItem>
                                        ) : (
                                            companies?.map(company => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billDate">Bill Date</Label>
                                <Input
                                    id="billDate"
                                    type="date"
                                    value={billDate}
                                    onChange={(e) => setBillDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="site">Site</Label>
                                <Input id="site" value={site} onChange={e => setSite(e.target.value)} placeholder="e.g., THANE DEPOT" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="poNumber">PO.NO</Label>
                                <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                            </div>
                        </div>

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
                                        type="text"
                                        placeholder="Rate (e.g., 500/hr)"
                                        value={item.rate || ''}
                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                        className="w-40"
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
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFormSubmit}>
                        {editingInvoice ? 'Update Invoice' : 'Save Invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete Invoice No. <span className="font-medium">{invoiceToDelete?.billNo}-MHE</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
    