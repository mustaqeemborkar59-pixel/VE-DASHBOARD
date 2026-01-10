
'use client';
import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Company, Invoice, CompanySettings, PageMargin, DownloadOptions } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, PlusCircle, EllipsisVertical, Download, Eye, FileText, Settings, Folder, FilePlus2, Copy, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ToWords } from 'to-words';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateAndDownloadInvoice, type PageSettings } from '@/lib/invoice-generator';
import { Textarea } from '@/components/ui/textarea';
import { InvoicePreview } from '@/components/invoice-preview';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const AutoHeightTextarea = React.memo(forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    useEffect(() => {
        const textarea = internalRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [props.value]);

    return <Textarea ref={internalRef} {...props} />;
}));
AutoHeightTextarea.displayName = 'AutoHeightTextarea';

type InvoiceItem = Omit<import('@/lib/data').InvoiceItem, 'id'> & { key: string };

const DocumentSettingsFields = React.memo(({ settings, onSettingsChange, onMarginChange, onFontSizeChange, prefix="page" }: { 
    settings: Partial<CompanySettings>, 
    onSettingsChange: (field: keyof CompanySettings, value: any) => void,
    onMarginChange: (field: keyof PageMargin, value: string) => void,
    onFontSizeChange: (field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => void,
    prefix?: string,
  }) => {
    return (
      <div className="grid gap-4">
          <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`${prefix}Size`}>Page Size</Label>
              <Select value={settings.pageSize} onValueChange={(value) => onSettingsChange('pageSize', value)} >
                  <SelectTrigger id={`${prefix}Size`} className="col-span-2 h-8">
                      <SelectValue placeholder="Select page size" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="LETTER">Letter</SelectItem>
                      <SelectItem value="LEGAL">Legal</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-3 items-start gap-4">
              <Label>Margins (cm)</Label>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Top" value={settings.pageMargins?.top ?? ''} onChange={(e) => onMarginChange('top', e.target.value)} className="h-8"/>
                  <Input type="number" placeholder="Bottom" value={settings.pageMargins?.bottom ?? ''} onChange={(e) => onMarginChange('bottom', e.target.value)} className="h-8"/>
                  <Input type="number" placeholder="Left" value={settings.pageMargins?.left ?? ''} onChange={(e) => onMarginChange('left', e.target.value)} className="h-8"/>
                  <Input type="number" placeholder="Right" value={settings.pageMargins?.right ?? ''} onChange={(e) => onMarginChange('right', e.target.value)} className="h-8"/>
              </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`${prefix}FontSize`}>Page Font</Label>
              <Input id={`${prefix}FontSize`} type="number" value={settings.pageFontSize ?? ''} onChange={(e) => onFontSizeChange('pageFontSize', e.target.value)} className="col-span-2 h-8" placeholder="e.g., 11"/>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`${prefix}AddressFontSize`}>Address Font</Label>
              <Input id={`${prefix}AddressFontSize`} type="number" value={settings.addressFontSize ?? ''} onChange={(e) => onFontSizeChange('addressFontSize', e.target.value)} className="col-span-2 h-8" placeholder="e.g., 10"/>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`${prefix}TableBodyFontSize`}>Table Font</Label>
              <Input id={`${prefix}TableBodyFontSize`} type="number" value={settings.tableBodyFontSize ?? ''} onChange={(e) => onFontSizeChange('tableBodyFontSize', e.target.value)} className="col-span-2 h-8" placeholder="e.g., 11"/>
          </div>
      </div>
    );
});
DocumentSettingsFields.displayName = 'DocumentSettingsFields';

export default function BillingPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const toISODateString = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  }
  
  const defaultPageSettings: PageSettings = {
    size: 'A4',
    orientation: 'portrait',
    margin: { top: 1.27, right: 1.27, bottom: 1.27, left: 1.27 },
    pageFontSize: 11,
    addressFontSize: 10,
    tableBodyFontSize: 11,
  };
  
  const defaultDownloadOptions: DownloadOptions = {
      myCompany: { showGstin: true, showPan: true, showBankDetails: true },
      clientCompany: { showGstin: true, showBankDetails: true }
  };
  
  const initialFormState = {
    companyId: '',
    billDate: toISODateString(new Date()),
    poNumber: 'AGREEMENT',
    site: '',
    items: [{ key: `item-${Date.now()}`, particulars: '', rate: '', amount: 0 }],
  };

  const [companyId, setCompanyId] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(toISODateString(new Date()));
  const [poNumber, setPoNumber] = useState('AGREEMENT');
  const [site, setSite] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>(initialFormState.items);
    
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoicePageSettings, setInvoicePageSettings] = useState<PageSettings>(defaultPageSettings);
  const [formDownloadOptions, setFormDownloadOptions] = useState<DownloadOptions>(defaultDownloadOptions);

  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToDuplicate, setInvoiceToDuplicate] = useState<Invoice | null>(null);
  const [newBillDateForDuplicate, setNewBillDateForDuplicate] = useState<string>(toISODateString(new Date()));
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isBulkDuplicateDialogOpen, setIsBulkDuplicateDialogOpen] = useState(false);
  const [newBillDateForBulk, setNewBillDateForBulk] = useState<string>(toISODateString(new Date()));


  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [invoiceForPreview, setInvoiceForPreview] = useState<Invoice | null>(null);
  
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [globalPageSettings, setGlobalPageSettings] = useState<Partial<CompanySettings>>(defaultPageSettings);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);

  // Queries
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const allInvoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billNo', 'desc')) : null, [firestore]);
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'companySettings', 'primary') : null, [firestore]);

  // Data
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(allInvoicesQuery);
  const { data: myCompanyDetails, isLoading: isLoadingSettings } = useDoc<CompanySettings>(settingsDocRef);
  
  useEffect(() => {
    if (myCompanyDetails) {
        setGlobalPageSettings(myCompanyDetails);
    }
  }, [myCompanyDetails]);


  const selectedCompanyForNewInvoice = useMemo(() => companies?.find(c => c.id === companyId), [companies, companyId]);

  const liveDefaultPageSettings = useMemo((): PageSettings => {
    if (!myCompanyDetails) return defaultPageSettings;
    return {
        size: myCompanyDetails.pageSize || defaultPageSettings.size,
        orientation: myCompanyDetails.pageOrientation || defaultPageSettings.orientation,
        margin: myCompanyDetails.pageMargins || defaultPageSettings.margin,
        pageFontSize: myCompanyDetails.pageFontSize || defaultPageSettings.pageFontSize,
        addressFontSize: myCompanyDetails.addressFontSize || defaultPageSettings.addressFontSize,
        tableBodyFontSize: myCompanyDetails.tableBodyFontSize || defaultPageSettings.tableBodyFontSize,
    }
  }, [myCompanyDetails]);

  
  const handleDownloadWord = async (invoice: Invoice) => {
    if (!invoice.clientCompanyDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find client company details for this invoice.' });
      return;
    }
    if (!invoice.myCompanyDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'Your company details were not saved with this invoice.' });
      return;
    }
    
    const pageSettingsToUse: PageSettings = {
        size: invoice.pageSize || liveDefaultPageSettings.size,
        orientation: invoice.pageOrientation || liveDefaultPageSettings.orientation,
        margin: invoice.pageMargins || liveDefaultPageSettings.margin,
        pageFontSize: invoice.pageFontSize || liveDefaultPageSettings.pageFontSize,
        addressFontSize: invoice.addressFontSize || liveDefaultPageSettings.addressFontSize,
        tableBodyFontSize: invoice.tableBodyFontSize || liveDefaultPageSettings.tableBodyFontSize,
    }

    try {
        await generateAndDownloadInvoice(invoice, invoice.clientCompanyDetails, invoice.myCompanyDetails, pageSettingsToUse, undefined, invoice.downloadOptions);
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Download Error',
            description: 'Could not generate Word document.',
        });
        console.error(e);
    }
  };

  const maxBillNumber = useMemo(() => {
    if (!allInvoices || allInvoices.length === 0) return 0;
    return Math.max(0, ...allInvoices.map(inv => inv.billNo));
  }, [allInvoices]);
  
  const nextBillNumber = useMemo(() => {
    if (isLoadingSettings) return null;
    const fromSettings = myCompanyDetails?.nextBillNo;
    const nextCalculated = maxBillNumber + 1;
    return fromSettings && fromSettings > nextCalculated ? fromSettings : nextCalculated;
  }, [myCompanyDetails, maxBillNumber, isLoadingSettings]);

  const organizedInvoices = useMemo(() => {
    if (!allInvoices) return [];

    const getFinancialYear = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      // Financial year starts in April (month 3)
      return month >= 3 ? year : year - 1;
    };

    const groupedByYear = allInvoices.reduce((acc, invoice) => {
      const billDate = parseISO(invoice.billDate);
      const financialYearStart = getFinancialYear(billDate);
      const yearKey = `${financialYearStart}-${financialYearStart + 1}`;
      
      if (!acc[yearKey]) {
        acc[yearKey] = [];
      }
      acc[yearKey].push(invoice);
      return acc;
    }, {} as Record<string, Invoice[]>);
    
    const sortedYearKeys = Object.keys(groupedByYear).sort((a,b) => b.localeCompare(a));

    return sortedYearKeys.map((yearKey, index) => {
      const yearInvoices = groupedByYear[yearKey];
      const [startYear] = yearKey.split('-').map(Number);
      const endYear = startYear + 1;

      const minBill = Math.min(...yearInvoices.map(inv => inv.billNo));
      const maxBill = Math.max(...yearInvoices.map(inv => inv.billNo));
      
      const groupedByMonth = yearInvoices.reduce((acc, invoice) => {
        const monthKey = format(parseISO(invoice.billDate), 'yyyy-MM');
        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(invoice);
        return acc;
      }, {} as Record<string, Invoice[]>);
      
      const months = Object.entries(groupedByMonth).map(([monthKey, monthInvoices]) => {
        const monthMinBill = Math.min(...monthInvoices.map(inv => inv.billNo));
        const monthMaxBill = Math.max(...monthInvoices.map(inv => inv.billNo));
        const monthDate = parseISO(`${monthKey}-01`);
        
        return {
          key: monthKey,
          label: `${format(monthDate, 'MM-MMM yyyy').toUpperCase()} (BILL NO-${monthMinBill}-${monthMaxBill})`,
          invoices: monthInvoices,
        };
      });

      return {
        key: yearKey,
        label: `${index + 1}-April ${startYear}-March ${endYear} (Bill-${minBill} to ${maxBill})`,
        months: months.sort((a, b) => b.key.localeCompare(a.key)), // Sort months descending
      };
    });

  }, [allInvoices]);


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
    setItems([...items, { key: `item-${Date.now()}`, particulars: '', rate: '', amount: 0 }]);
  };

  const handleRemoveItem = (key: string) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
  };

  const handleItemChange = (key: string, field: keyof Omit<InvoiceItem, 'key'>, value: string | number) => {
    const newItems = items.map(item => {
        if(item.key === key) {
            let parsedValue;
            if (field === 'amount') {
                const numericString = String(value).replace(/,/g, '');
                parsedValue = parseFloat(numericString) || 0;
            } else {
                parsedValue = value;
            }
            return { ...item, [field]: parsedValue };
        }
        return item;
    });
    setItems(newItems);
  };
  
  const amountInWords = useMemo(() => {
    return toWords.convert(calculations.grandTotal).toUpperCase();
  },[calculations.grandTotal, toWords]);
  
  
  const resetForm = () => {
      setCompanyId(initialFormState.companyId);
      setBillDate(initialFormState.billDate);
      setPoNumber(initialFormState.poNumber);
      setSite(initialFormState.site);
      setItems(initialFormState.items);
      setEditingInvoice(null);
      setInvoicePageSettings(liveDefaultPageSettings);
      setFormDownloadOptions(defaultDownloadOptions);
  };

  const handleFormSubmit = async () => {
    if (!companyId || !billDate || items.some(i => !i.particulars || i.amount <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a company, date, and fill all invoice items with an amount.',
      });
      return;
    }
    
    if (!myCompanyDetails && !editingInvoice) {
      toast({
        variant: 'destructive',
        title: 'Company Settings Missing',
        description: 'Your company details are not set. Please go to the Settings page to add them before creating an invoice.',
      });
      return;
    }

    if (firestore && settingsDocRef) {
      const billNoToUse = editingInvoice ? editingInvoice.billNo : (nextBillNumber || maxBillNumber + 1);

      if (isNaN(billNoToUse)) {
        toast({ variant: 'destructive', title: 'Invalid Bill Number', description: 'Could not determine next bill number.' });
        return;
      }
      
      const itemsToSave = items.map(({ key, ...rest }) => rest);
      
      const currentInvoiceSettings = {
          pageSize: invoicePageSettings.size,
          pageOrientation: invoicePageSettings.orientation,
          pageMargins: invoicePageSettings.margin,
          pageFontSize: invoicePageSettings.pageFontSize,
          addressFontSize: invoicePageSettings.addressFontSize,
          tableBodyFontSize: invoicePageSettings.tableBodyFontSize,
        };

      const currentDownloadOptions = formDownloadOptions;

      const invoiceData: Omit<Invoice, 'id'> = {
        billNo: billNoToUse,
        billNoSuffix: 'MHE',
        billDate: billDate,
        companyId,
        poNumber,
        site,
        items: itemsToSave,
        netTotal: calculations.netTotal,
        cgst: calculations.cgst,
        sgst: calculations.sgst,
        grandTotal: calculations.grandTotal,
        myCompanyDetails: editingInvoice?.myCompanyDetails || myCompanyDetails!,
        clientCompanyDetails: editingInvoice?.clientCompanyDetails || selectedCompanyForNewInvoice!,
        ...currentInvoiceSettings,
        downloadOptions: currentDownloadOptions,
      };

      try {
        if (editingInvoice) {
          const invoiceDocRef = doc(firestore, 'invoices', editingInvoice.id);
          const { myCompanyDetails: _mc, clientCompanyDetails: _cc, ...updateData } = invoiceData;
          
          updateDocumentNonBlocking(invoiceDocRef, {
            ...updateData,
            clientCompanyDetails: editingInvoice.clientCompanyDetails, // Preserve snapshot
            myCompanyDetails: editingInvoice.myCompanyDetails, // Preserve snapshot
            downloadOptions: formDownloadOptions,
            ...currentInvoiceSettings
          });

          toast({
              title: 'Invoice Updated',
              description: `Invoice No. ${invoiceData.billNo}-MHE has been updated.`,
          });
        } else {
          addDocumentNonBlocking(collection(firestore, 'invoices'), invoiceData);
          setDoc(settingsDocRef, { nextBillNo: billNoToUse + 1 }, { merge: true });
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
    if (invoice) {
      setEditingInvoice(invoice);
      setCompanyId(invoice.companyId);
      setBillDate(invoice.billDate);
      setPoNumber(invoice.poNumber || 'AGREEMENT');
      setSite(invoice.site || '');
      setItems(invoice.items.map((item, index) => ({ ...item, key: `item-${Date.now()}-${index}` })));
      setInvoicePageSettings({
          size: invoice.pageSize || liveDefaultPageSettings.size,
          orientation: invoice.pageOrientation || liveDefaultPageSettings.orientation,
          margin: invoice.pageMargins || liveDefaultPageSettings.margin,
          pageFontSize: invoice.pageFontSize || liveDefaultPageSettings.pageFontSize,
          addressFontSize: invoice.addressFontSize || liveDefaultPageSettings.addressFontSize,
          tableBodyFontSize: invoice.tableBodyFontSize || liveDefaultPageSettings.tableBodyFontSize,
      });
      setFormDownloadOptions(invoice.downloadOptions || defaultDownloadOptions);

    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };
  
  const handleOpenPreview = (invoice: Invoice) => {
    setInvoiceForPreview(invoice);
    setIsPreviewOpen(true);
  };

  const handleOpenDuplicateDialog = (invoice: Invoice) => {
    setInvoiceToDuplicate(invoice);
    setNewBillDateForDuplicate(toISODateString(new Date())); // Reset to today's date
  };

  const handleConfirmDuplicate = () => {
    if (!invoiceToDuplicate || !firestore || !nextBillNumber || !settingsDocRef) {
        toast({ variant: "destructive", title: "Error", description: "Could not duplicate invoice. Please try again." });
        return;
    }

    const { id, billNo, billDate, ...restOfInvoice } = invoiceToDuplicate;

    const duplicatedInvoiceData: Omit<Invoice, 'id'> = {
        ...restOfInvoice,
        billNo: nextBillNumber,
        billDate: newBillDateForDuplicate,
    };
    
    addDocumentNonBlocking(collection(firestore, 'invoices'), duplicatedInvoiceData);
    setDoc(settingsDocRef, { nextBillNo: nextBillNumber + 1 }, { merge: true });

    toast({
        title: "Invoice Duplicated",
        description: `New invoice No. ${nextBillNumber}-MHE created.`,
    });
    setInvoiceToDuplicate(null);
  };
  
  const handleConfirmBulkDuplicate = async () => {
    if (!firestore || !nextBillNumber || !settingsDocRef || selectedInvoices.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "Could not duplicate invoices. Please try again." });
        return;
    }

    const batch = writeBatch(firestore);
    const invoicesToDuplicate = allInvoices?.filter(inv => selectedInvoices.includes(inv.id)) || [];
    let currentBillNumber = nextBillNumber;

    for (const invoice of invoicesToDuplicate) {
        const { id, billNo, billDate, ...restOfInvoice } = invoice;
        const newInvoiceRef = doc(collection(firestore, 'invoices'));
        batch.set(newInvoiceRef, {
            ...restOfInvoice,
            billNo: currentBillNumber,
            billDate: newBillDateForBulk,
        });
        currentBillNumber++;
    }
    
    batch.set(settingsDocRef, { nextBillNo: currentBillNumber }, { merge: true });

    try {
        await batch.commit();
        toast({
            title: "Invoices Duplicated",
            description: `${selectedInvoices.length} invoices have been duplicated with new bill numbers starting from ${nextBillNumber}.`,
        });
        setSelectedInvoices([]);
        setIsBulkDuplicateDialogOpen(false);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "An error occurred during bulk duplication." });
    }
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
  
  const handleGlobalSettingsChange = (field: keyof CompanySettings, value: any) => {
    setGlobalPageSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleGlobalMarginChange = (field: keyof PageMargin, value: string) => {
      const numValue = value === '' ? '' : parseFloat(value);
      if (numValue === '' || !isNaN(numValue as number)) {
        setGlobalPageSettings(prev => ({
            ...prev,
            pageMargins: { ...(prev.pageMargins || {top:0,left:0,bottom:0,right:0}), [field]: numValue }
        }));
      }
  };

  const handleGlobalFontSizeChange = (field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => {
      const numValue = value === '' ? '' : parseInt(value, 10);
      if (numValue === '' || !isNaN(numValue as number)) {
        handleGlobalSettingsChange(field, numValue);
      }
  };

  const handleSaveDefaultSettings = async () => {
    if (!firestore || !settingsDocRef) return;
    setIsSubmittingSettings(true);
    try {
        await setDoc(settingsDocRef, globalPageSettings, { merge: true });
        toast({ title: "Success", description: "Default settings updated." });
        setIsSettingsPopoverOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save default settings.' });
    } finally {
        setIsSubmittingSettings(false);
    }
  };
  

  const DownloadOptionsFields = ({ options, setOptions }: { options: DownloadOptions, setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>> }) => (
    <div className="space-y-6">
        <div className="space-y-4">
            <h4 className="font-semibold text-foreground">My Company Details</h4>
            <div className="flex items-center space-x-2">
                <Checkbox id="myGstin" checked={options.myCompany.showGstin} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, myCompany: {...prev.myCompany, showGstin: !!checked} }))} />
                <Label htmlFor="myGstin">Show GSTIN</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="myPan" checked={options.myCompany.showPan} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, myCompany: {...prev.myCompany, showPan: !!checked} }))} />
                <Label htmlFor="myPan">Show PAN Number</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="myBank" checked={options.myCompany.showBankDetails} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, myCompany: {...prev.myCompany, showBankDetails: !!checked} }))} />
                <Label htmlFor="myBank">Show Bank Details</Label>
            </div>
        </div>
        <Separator />
        <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Client Company Details</h4>
            <div className="flex items-center space-x-2">
                <Checkbox id="clientGstin" checked={options.clientCompany.showGstin} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, clientCompany: {...prev.clientCompany, showGstin: !!checked} }))} />
                <Label htmlFor="clientGstin">Show GSTIN</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="clientBank" checked={options.clientCompany.showBankDetails} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, clientCompany: {...prev.clientCompany, showBankDetails: !!checked} }))} />
                <Label htmlFor="clientBank">Show Bank Details</Label>
            </div>
        </div>
    </div>
  );

  const handleDocSettingsChange = useCallback((field: keyof PageSettings, value: any) => {
    setInvoicePageSettings(prev => ({...prev, [field]: value}));
  }, []);

  const handleDocMarginChange = useCallback((field: keyof PageMargin, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) || value === '') {
        setInvoicePageSettings(prev => ({
            ...prev,
            margin: { ...(prev.margin || {top:0,left:0,bottom:0,right:0}), [field]: value === '' ? 0 : numValue }
        }));
    }
  }, []);

  const handleDocFontSizeChange = useCallback((field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) || value === '') {
        setInvoicePageSettings(prev => ({...prev, [field]: value === '' ? 0 : numValue}));
    }
  }, []);

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    setSelectedInvoices(prev => {
      if (checked) {
        return [...prev, invoiceId];
      } else {
        return prev.filter(id => id !== invoiceId);
      }
    });
  };

  const handleSelectMonth = (monthInvoices: Invoice[], checked: boolean) => {
    const monthInvoiceIds = monthInvoices.map(inv => inv.id);
    setSelectedInvoices(prev => {
        const otherIds = prev.filter(id => !monthInvoiceIds.includes(id));
        return checked ? [...otherIds, ...monthInvoiceIds] : otherIds;
    });
  };

  const renderInvoiceActions = (invoice: Invoice) => (
    <DropdownMenuContent className="w-40">
        <DropdownMenuItem onSelect={() => handleOpenPreview(invoice)}>
            <Eye className="mr-2 h-4 w-4" />Preview
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleDownloadWord(invoice)}>
            <Download className="mr-2 h-4 w-4" />Download
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleOpenFormDialog(invoice)}>
            <Pencil className="mr-2 h-4 w-4" />Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleOpenDuplicateDialog(invoice)}>
            <FilePlus2 className="mr-2 h-4 w-4" />Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setInvoiceToDelete(invoice)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />Delete
        </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>View, edit, and create new invoices organized by financial year.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        {selectedInvoices.length > 0 && (
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            Bulk Actions ({selectedInvoices.length})
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setIsBulkDuplicateDialogOpen(true)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicate Selected
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedInvoices([])} className="h-9 w-9">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Popover open={isSettingsPopoverOpen} onOpenChange={setIsSettingsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96">
                                <div className="space-y-4">
                                    <h4 className="font-medium leading-none">Default Document Settings</h4>
                                    <p className="text-sm text-muted-foreground">Set the default layout for new invoices.</p>
                                    <DocumentSettingsFields 
                                        settings={globalPageSettings} 
                                        onSettingsChange={handleGlobalSettingsChange}
                                        onMarginChange={handleGlobalMarginChange}
                                        onFontSizeChange={handleGlobalFontSizeChange}
                                        prefix="global"
                                    />
                                    <Button onClick={handleSaveDefaultSettings} disabled={isSubmittingSettings} className="w-full">
                                        {isSubmittingSettings ? 'Saving...' : 'Save Defaults'}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button onClick={() => handleOpenFormDialog(null)} size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Invoice
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/40">
                    <div className="flex-1 w-full sm:w-auto">
                        <Label htmlFor="invoiceStart" className="text-sm font-medium">Next Invoice Number</Label>
                        <p className="text-xs text-muted-foreground">The next bill number will be <span className='font-bold'>{nextBillNumber || '...'}</span>. You can change this in Settings.</p>
                    </div>
                </div>

                {isLoadingInvoices ? (
                    <div className="text-center py-10 text-muted-foreground">Loading invoices...</div>
                ) : organizedInvoices.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {organizedInvoices.map((year, yearIndex) => (
                             <AccordionItem value={`year-${year.key}`} key={year.key} className="mb-2 border-0">
                                <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/80 rounded-md text-sm font-medium hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <Folder className="h-5 w-5 text-primary" />
                                      <span>{year.label}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pl-0 md:pl-4">
                                     <Accordion type="multiple" className="w-full">
                                        {year.months.map(month => {
                                            const allInMonthSelected = month.invoices.every(inv => selectedInvoices.includes(inv.id));
                                            return (
                                            <AccordionItem value={`month-${month.key}`} key={month.key} className="border-l-0 md:border-l-2 border-dashed border-border pl-0 md:pl-4 py-1">
                                                 <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-md">
                                                     <Checkbox
                                                        id={`select-month-${month.key}`}
                                                        checked={allInMonthSelected}
                                                        onCheckedChange={(checked) => handleSelectMonth(month.invoices, !!checked)}
                                                        aria-label={`Select all invoices in ${month.label}`}
                                                      />
                                                    <AccordionTrigger className="flex-1 p-0 text-xs font-medium hover:no-underline">
                                                        <div className="flex items-center gap-2">
                                                            <Folder className="h-4 w-4 text-secondary-foreground/60" />
                                                            <span>{month.label}</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                 </div>
                                                <AccordionContent className="pt-2">
                                                    <div className="md:hidden">
                                                        <div className="space-y-4 p-4">
                                                        {month.invoices.map((invoice) => (
                                                            <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-start gap-3">
                                                                      <Checkbox 
                                                                        id={`select-inv-mob-${invoice.id}`} 
                                                                        className="mt-1"
                                                                        checked={selectedInvoices.includes(invoice.id)}
                                                                        onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                                                                      />
                                                                      <div className="space-y-1 cursor-pointer" onClick={() => handleOpenPreview(invoice)}>
                                                                          <div className="font-bold">Bill No: {invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</div>
                                                                          <div className="text-sm text-muted-foreground">{invoice.clientCompanyDetails?.name || 'Unknown'}</div>
                                                                      </div>
                                                                    </div>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="-mt-2 -mr-2 h-8 w-8 p-0">
                                                                                <EllipsisVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        {renderInvoiceActions(invoice)}
                                                                    </DropdownMenu>
                                                                </div>
                                                                <div className="text-sm space-y-1" onClick={() => handleOpenPreview(invoice)}>
                                                                    <div><span className="font-medium text-muted-foreground">Date: </span>{format(parseISO(invoice.billDate), 'dd MMM, yyyy')}</div>
                                                                    <div><span className="font-medium text-muted-foreground">Amount: </span>{invoice.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        </div>
                                                    </div>
                                                    <Table className="hidden md:table">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-12 px-4"></TableHead>
                                                                <TableHead>Bill No.</TableHead>
                                                                <TableHead>Company</TableHead>
                                                                <TableHead>Bill Date</TableHead>
                                                                <TableHead className="text-right">Amount</TableHead>
                                                                <TableHead className="w-[100px] text-right"><span className="sr-only">Actions</span></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {month.invoices.map((invoice) => (
                                                                <TableRow key={invoice.id} data-state={selectedInvoices.includes(invoice.id) ? "selected" : ""}>
                                                                    <TableCell className="px-4">
                                                                        <Checkbox 
                                                                          id={`select-inv-desk-${invoice.id}`}
                                                                          checked={selectedInvoices.includes(invoice.id)}
                                                                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                                                                          aria-label={`Select invoice ${invoice.billNo}`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="font-medium cursor-pointer" onClick={() => handleOpenPreview(invoice)}>
                                                                        {invoice.billNo}-{invoice.billNoSuffix || 'MHE'}
                                                                    </TableCell>
                                                                    <TableCell onClick={() => handleOpenPreview(invoice)} className="cursor-pointer">{invoice.clientCompanyDetails?.name || 'Unknown'}</TableCell>
                                                                    <TableCell onClick={() => handleOpenPreview(invoice)} className="cursor-pointer">{format(parseISO(invoice.billDate), 'dd MMM, yyyy')}</TableCell>
                                                                    <TableCell className="text-right cursor-pointer" onClick={() => handleOpenPreview(invoice)}>{invoice.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                                                    <EllipsisVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            {renderInvoiceActions(invoice)}
                                                                        </DropdownMenu>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionContent>
                                            </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        No invoices found. Click "Add Invoice" to get started.
                    </div>
                )}
            </CardContent>
        </Card>

        <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
            setIsFormDialogOpen(isOpen);
            if (!isOpen) {
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
                                <Select value={companyId} onValueChange={setCompanyId} disabled={isLoadingCompanies || !!editingInvoice}>
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
                                <div key={item.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <AutoHeightTextarea
                                        placeholder="Item description"
                                        value={item.particulars}
                                        onChange={(e) => handleItemChange(item.key, 'particulars', e.target.value)}
                                        className="flex-grow resize-none overflow-hidden"
                                        rows={1}
                                    />
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Input
                                            type="text"
                                            placeholder="Rate (e.g., 500/hr)"
                                            value={item.rate || ''}
                                            onChange={(e) => handleItemChange(item.key, 'rate', e.target.value)}
                                            className="w-full sm:w-40"
                                        />
                                        <Input
                                            type="text"
                                            placeholder="Amount"
                                            value={item.amount ? new Intl.NumberFormat('en-IN').format(item.amount) : ''}
                                            onChange={(e) => handleItemChange(item.key, 'amount', e.target.value)}
                                            className="w-full sm:w-48 text-right"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.key)} disabled={items.length === 1}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
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

                        {editingInvoice && (
                          <>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Document Settings</h3>
                                <p className="text-sm text-muted-foreground">
                                    Adjust layout and display options. These settings will be saved with the invoice.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-4 border rounded-lg">
                                      <DocumentSettingsFields 
                                         settings={invoicePageSettings} 
                                         onSettingsChange={handleDocSettingsChange}
                                         onMarginChange={handleDocMarginChange}
                                         onFontSizeChange={handleDocFontSizeChange}
                                      />
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                      <DownloadOptionsFields options={formDownloadOptions} setOptions={setFormDownloadOptions} />
                                    </div>
                                </div>
                            </div>
                          </>
                        )}
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

        <AlertDialog open={!!invoiceToDuplicate} onOpenChange={(open) => !open && setInvoiceToDuplicate(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Duplicate Invoice</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select a new bill date for the duplicated invoice. The next available bill number ({nextBillNumber}) will be used.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="newBillDate">New Bill Date</Label>
                    <Input
                        id="newBillDate"
                        type="date"
                        value={newBillDateForDuplicate}
                        onChange={(e) => setNewBillDateForDuplicate(e.target.value)}
                        className="w-full mt-2"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDuplicate}>Duplicate</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isBulkDuplicateDialogOpen} onOpenChange={setIsBulkDuplicateDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bulk Duplicate Invoices</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to duplicate <span className="font-bold">{selectedInvoices.length}</span> invoices. 
                        The new invoices will be assigned bill numbers starting from <span className="font-bold">{nextBillNumber}</span>. 
                        Please select a common bill date for all new invoices.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="newBulkBillDate">New Bill Date</Label>
                    <Input
                        id="newBulkBillDate"
                        type="date"
                        value={newBillDateForBulk}
                        onChange={(e) => setNewBillDateForBulk(e.target.value)}
                        className="w-full mt-2"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmBulkDuplicate}>Duplicate {selectedInvoices.length} Invoices</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-4xl p-0">
                 <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Invoice Preview</DialogTitle>
                    <DialogDescription>
                        A preview of Invoice No. {invoiceForPreview?.billNo}-{invoiceForPreview?.billNoSuffix || 'MHE'}.
                    </DialogDescription>
                </DialogHeader>
                <div className={cn("px-6 pb-6 overflow-y-auto max-h-[80vh]", "hide-scrollbar")}>
                   <InvoicePreview 
                    invoice={invoiceForPreview} 
                    company={invoiceForPreview?.clientCompanyDetails || null} 
                    myCompanyDetails={invoiceForPreview?.myCompanyDetails || null}
                    downloadOptions={invoiceForPreview?.downloadOptions || defaultDownloadOptions}
                  />
                </div>
            </DialogContent>
        </Dialog>
        
      </div>
    </AppLayout>
  );
}

    