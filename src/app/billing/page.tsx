
'use client';
import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, writeBatch, deleteField } from 'firebase/firestore';
import { Company, Invoice, CompanySettings, PageMargin, DownloadOptions, BankAccount, InvoiceTemplate, InvoiceItem as LibInvoiceItem, DocumentSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, PlusCircle, EllipsisVertical, Download, Eye, FileText, Settings, Folder, FilePlus2, Copy, X, Bold, Pilcrow, AlignLeft, AlignCenter, AlignRight, ChevronDown, AlertTriangle } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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


type InvoiceItem = Omit<LibInvoiceItem, 'id'> & { key: string };
type ActiveInput = { key: string; field: 'particulars' | 'rate' } | null;
type Enterprise = 'Vithal' | 'RV';
type DiscountType = 'before_gst' | 'after_gst';

const DocumentSettingsFields = React.memo(forwardRef<HTMLDivElement, {
    settings: Partial<DocumentSettings>, 
    onSettingsChange: (field: keyof DocumentSettings, value: any) => void,
    onMarginChange: (field: keyof PageMargin, value: string) => void,
    onFontSizeChange: (field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => void,
    prefix?: string,
}>(({ settings, onSettingsChange, onMarginChange, onFontSizeChange, prefix="page" }, ref) => {
    return (
      <div className="grid gap-4" ref={ref}>
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
                  <Input type="text" inputMode="decimal" placeholder="Top" value={settings.pageMargins?.top ?? ''} onChange={(e) => onMarginChange('top', e.target.value)} className="h-8"/>
                  <Input type="text" inputMode="decimal" placeholder="Bottom" value={settings.pageMargins?.bottom ?? ''} onChange={(e) => onMarginChange('bottom', e.target.value)} className="h-8"/>
                  <Input type="text" inputMode="decimal" placeholder="Left" value={settings.pageMargins?.left ?? ''} onChange={(e) => onMarginChange('left', e.target.value)} className="h-8"/>
                  <Input type="text" inputMode="decimal" placeholder="Right" value={settings.pageMargins?.right ?? ''} onChange={(e) => onMarginChange('right', e.target.value)} className="h-8"/>
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
}));
DocumentSettingsFields.displayName = 'DocumentSettingsFields';

const ColumnAlignmentFields = ({ template, onTemplateChange, onTemplateFontSizeChange, items }: { 
    template: InvoiceTemplate, 
    onTemplateChange: (id: string, align: 'left' | 'center' | 'right') => void,
    onTemplateFontSizeChange: (id: string, size: string) => void,
    items: InvoiceItem[]
  }) => {
    const hasRateColumn = useMemo(() => items.some(item => item.rate && String(item.rate).trim() !== ''), [items]);
    const columnsToShow = useMemo(() => template.columns.filter(col => hasRateColumn || col.id !== 'rate'), [template.columns, hasRateColumn]);
    
    return (
        <div className="space-y-4">
             <h4 className="font-semibold text-foreground">Column Styles</h4>
             <div className="space-y-4">
                {columnsToShow.map(col => (
                    <div key={col.id} className="grid gap-2">
                        <Label>{col.label}</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 p-1 bg-muted rounded-md flex items-center justify-between">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <Button 
                                        key={align} 
                                        type="button" 
                                        variant={col.align === align ? 'default' : 'ghost'} 
                                        size="icon" 
                                        className="h-7 w-7 flex-1"
                                        onClick={() => onTemplateChange(col.id, align)}
                                    >
                                        {align === 'left' && <AlignLeft className="h-4 w-4" />}
                                        {align === 'center' && <AlignCenter className="h-4 w-4" />}
                                        {align === 'right' && <AlignRight className="h-4 w-4" />}
                                    </Button>
                                ))}
                            </div>
                            <Input 
                                type="number" 
                                placeholder="Size" 
                                value={col.fontSize ?? ''} 
                                onChange={(e) => onTemplateFontSizeChange(col.id, e.target.value)}
                                className="h-9 w-20"
                            />
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
}

const DownloadOptionsFields = ({ options, setOptions }: { options: DownloadOptions, setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>> }) => {
    return (
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
                 <div className="flex items-center space-x-2">
                    <Checkbox id="mySac" checked={options.myCompany.showSacCode} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, myCompany: {...prev.myCompany, showSacCode: !!checked} }))} />
                    <Label htmlFor="mySac">Show SAC Code</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="myServiceTax" checked={options.myCompany.showServiceTaxCode} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, myCompany: {...prev.myCompany, showServiceTaxCode: !!checked} }))} />
                    <Label htmlFor="myServiceTax">Show Service Tax Code</Label>
                </div>
            </div>
            <Separator />
            <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Client Company Details</h4>
                <div className="flex items-center space-x-2">
                    <Checkbox id="clientGstin" checked={options.clientCompany.showGstin} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, clientCompany: {...prev.clientCompany, showGstin: !!checked} }))} />
                    <Label htmlFor="clientGstin">Show GSTIN</Label>
                </div>
            </div>
            <Separator />
            <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Filename Options</h4>
                <div className="flex items-center space-x-2">
                    <Checkbox id="includeSite" checked={options.includeSiteInFilename} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeSiteInFilename: !!checked }))} />
                    <Label htmlFor="includeSite">Include Site in Filename</Label>
                </div>
            </div>
        </div>
    );
};

const InvoiceActions = ({ invoice, openPreviewDialog, handleDownloadWord, openFormDialog, openDuplicateDialog, openDeleteDialog }: {
    invoice: Invoice;
    openPreviewDialog: (invoice: Invoice) => void;
    handleDownloadWord: (invoice: Invoice) => Promise<void>;
    openFormDialog: (invoice: Invoice | null) => void;
    openDuplicateDialog: (invoice: Invoice) => void;
    openDeleteDialog: (invoice: Invoice) => void;
}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <EllipsisVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
            <DropdownMenuItem onSelect={() => openPreviewDialog(invoice)}>
                <Eye className="mr-2 h-4 w-4" />Preview
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleDownloadWord(invoice)}>
                <Download className="mr-2 h-4 w-4" />Download
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openFormDialog(invoice)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDuplicateDialog(invoice)}>
                <FilePlus2 className="mr-2 h-4 w-4" />Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeleteDialog(invoice)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

const InvoiceList = ({ 
    invoices, 
    isLoadingInvoices, 
    openYearAccordions, 
    setOpenYearAccordions, 
    openMonthAccordions, 
    setOpenMonthAccordions, 
    selectedInvoices, 
    handleSelectInvoice, 
    getCompanyDisplay,
    ...actionProps
}: {
    invoices: ReturnType<typeof useMemo>;
    isLoadingInvoices: boolean;
    openYearAccordions: string[];
    setOpenYearAccordions: (value: string[]) => void;
    openMonthAccordions: string[];
    setOpenMonthAccordions: (value: string[]) => void;
    selectedInvoices: string[];
    handleSelectInvoice: (invoiceId: string, checked: boolean) => void;
    getCompanyDisplay: (invoice: Invoice) => string;
} & Omit<React.ComponentProps<typeof InvoiceActions>, 'invoice'>) => (
  <>
    {isLoadingInvoices ? (
        <div className="text-center py-10 text-muted-foreground">Loading invoices...</div>
    ) : invoices.length > 0 ? (
        <Accordion type="multiple" className="w-full" value={openYearAccordions} onValueChange={setOpenYearAccordions}>
            {invoices.map((year: any, yearIndex: number) => (
                 <AccordionItem value={`year-${year.key}`} key={year.key} className="mb-2 border-0">
                    <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/80 rounded-md text-sm font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                          <span>{year.label}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pl-0 md:pl-4">
                         <Accordion type="multiple" className="w-full" value={openMonthAccordions} onValueChange={setOpenMonthAccordions}>
                            {year.months.map((month: any) => {
                                return (
                                <AccordionItem value={`month-${month.key}`} key={month.key} className="border-l-0 md:border-l-2 border-dashed border-border pl-0 md:pl-4 py-1">
                                    <AccordionTrigger className="flex items-center justify-between flex-1 text-xs font-medium hover:no-underline p-3 bg-muted/50 hover:bg-muted/80 rounded-md">
                                         <div className="flex items-center gap-2">
                                              <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                                              <span>{month.label}</span>
                                         </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <div className="md:hidden">
                                            <div className="space-y-4 p-4">
                                            {month.invoices.map((invoice: Invoice) => (
                                                <div key={invoice.id} className="border rounded-lg p-3 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-3">
                                                            <div className="relative">
                                                                <Checkbox 
                                                                    id={`select-inv-mob-${invoice.id}`} 
                                                                    className="mt-1"
                                                                    checked={selectedInvoices.includes(invoice.id)}
                                                                    onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                                                                />
                                                                {selectedInvoices.includes(invoice.id) && (
                                                                    <div className="absolute top-0 -right-2.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                                                        {selectedInvoices.indexOf(invoice.id) + 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                          <div className="space-y-1 cursor-pointer" onClick={() => actionProps.openPreviewDialog(invoice)}>
                                                              <div className="font-bold">Bill No: {invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</div>
                                                              <div className="text-sm text-muted-foreground">{getCompanyDisplay(invoice)}</div>
                                                          </div>
                                                        </div>
                                                        <InvoiceActions invoice={invoice} {...actionProps} />
                                                    </div>
                                                    <div className="text-sm space-y-1" onClick={() => actionProps.openPreviewDialog(invoice)}>
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
                                                {month.invoices.map((invoice: Invoice) => (
                                                    <TableRow key={invoice.id} data-state={selectedInvoices.includes(invoice.id) ? "selected" : ""}>
                                                        <TableCell className="px-4 py-2 relative">
                                                            <Checkbox 
                                                              id={`select-inv-desk-${invoice.id}`}
                                                              checked={selectedInvoices.includes(invoice.id)}
                                                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                                                              aria-label={`Select invoice ${invoice.billNo}`}
                                                            />
                                                            {selectedInvoices.includes(invoice.id) && (
                                                                <div className="absolute top-2 left-8 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                                                    {selectedInvoices.indexOf(invoice.id) + 1}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium cursor-pointer py-2" onClick={() => actionProps.openPreviewDialog(invoice)}>
                                                            {invoice.billNo}-{invoice.billNoSuffix || 'MHE'}
                                                        </TableCell>
                                                        <TableCell onClick={() => actionProps.openPreviewDialog(invoice)} className="cursor-pointer py-2">{getCompanyDisplay(invoice)}</TableCell>
                                                        <TableCell onClick={() => actionProps.openPreviewDialog(invoice)} className="cursor-pointer py-2">{format(parseISO(invoice.billDate), 'dd MMM, yyyy')}</TableCell>
                                                        <TableCell className="text-right cursor-pointer py-2" onClick={() => actionProps.openPreviewDialog(invoice)}>{invoice.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                                        <TableCell className="text-right py-2">
                                                            <InvoiceActions invoice={invoice} {...actionProps} />
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
            No invoices found for this enterprise. Click "Add Invoice" to get started.
        </div>
    )}
  </>
);

export default function BillingPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Enterprise>('Vithal');
  const [formEnterprise, setFormEnterprise] = useState<Enterprise>(activeTab);
  
  const toISODateString = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  }

  const toMonthString = (date: Date) => {
    return format(date, 'yyyy-MM');
  }
  
  const defaultDocumentSettings: DocumentSettings = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: { top: 1.27, right: 1.27, bottom: 1.27, left: 1.27 },
    pageFontSize: 11,
    addressFontSize: 10,
    tableBodyFontSize: 11,
  };
  
  const defaultDownloadOptions: DownloadOptions = {
      myCompany: { showGstin: true, showPan: true, showBankDetails: true, showSacCode: true, showServiceTaxCode: true },
      clientCompany: { showGstin: true },
      includeSiteInFilename: false,
  };

  const defaultTemplate: InvoiceTemplate = {
      columns: [
          { id: 'sr_no', label: 'Sr. No', align: 'center' },
          { id: 'particulars', label: 'Particulars', align: 'left' },
          { id: 'rate', label: 'Rate', align: 'right' },
          { id: 'amount', label: 'Amount', align: 'right' },
      ],
  };
  
  const initialFormState = {
    companyId: '',
    billDate: toISODateString(new Date()),
    billingMonth: toMonthString(new Date()),
    poNumber: 'AGREEMENT',
    site: '',
    items: [{ key: `item-${Date.now()}`, particulars: '', rate: '', amount: 0 }],
    selectedBankAccountId: 'no_bank',
    discount: '',
    discountType: 'after_gst' as DiscountType,
    advanceReceived: '',
    tdsPercentage: '',
  };

  const [companyId, setCompanyId] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(toISODateString(new Date()));
  const [billingMonth, setBillingMonth] = useState<string>(toMonthString(new Date()));
  const [poNumber, setPoNumber] = useState('AGREEMENT');
  const [site, setSite] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>(initialFormState.items);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('no_bank');
  const [activeInput, setActiveInput] = useState<ActiveInput>(null);
  const [discount, setDiscount] = useState<string>('');
  const [discountType, setDiscountType] = useState<DiscountType>('after_gst');
  const [advanceReceived, setAdvanceReceived] = useState<string>('');
  const [tdsPercentage, setTdsPercentage] = useState<string>('');

    
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoicePageSettings, setInvoicePageSettings] = useState<DocumentSettings>(defaultDocumentSettings);
  const [formDownloadOptions, setFormDownloadOptions] = useState<DownloadOptions>(defaultDownloadOptions);
  const [formTemplate, setFormTemplate] = useState<InvoiceTemplate>(defaultTemplate);

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
  const [globalPageSettings, setGlobalPageSettings] = useState<Partial<CompanySettings> | any>(defaultDocumentSettings);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  
  const [openYearAccordions, setOpenYearAccordions] = useState<string[]>([]);
  const [openMonthAccordions, setOpenMonthAccordions] = useState<string[]>([]);


  // Queries
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name')) : null, [firestore]);
  const allInvoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billNo', 'asc')) : null, [firestore]);
  
  const vithalSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'companySettings', 'vithal') : null, [firestore]);
  const rvSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'companySettings', 'rv') : null, [firestore]);

  const bankAccountsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companySettings', 'primary', 'bankAccounts'), orderBy('nickname')) : null, [firestore]);


  // Data
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: allInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(allInvoicesQuery);
  
  const { data: vithalCompanyDetails, isLoading: isLoadingVithalSettings } = useDoc<CompanySettings>(vithalSettingsRef);
  const { data: rvCompanyDetails, isLoading: isLoadingRvSettings } = useDoc<CompanySettings>(rvSettingsRef);

  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const isLoadingSettings = isLoadingVithalSettings || isLoadingRvSettings;
  const myCompanyDetails = activeTab === 'Vithal' ? vithalCompanyDetails : rvCompanyDetails;


  useEffect(() => {
    if (myCompanyDetails) {
        setGlobalPageSettings(myCompanyDetails);
    }
  }, [myCompanyDetails]);
  
  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };
  
  const closeAllDialogs = useCallback(() => {
    setIsFormDialogOpen(false);
    setInvoiceToDelete(null);
    setInvoiceToDuplicate(null);
    setIsBulkDuplicateDialogOpen(false);
    setIsPreviewOpen(false);
  }, []);
  
  const liveDefaultPageSettings = useMemo((): DocumentSettings => {
    if (!myCompanyDetails) return defaultDocumentSettings;
    return {
        pageSize: myCompanyDetails.pageSize || defaultDocumentSettings.pageSize,
        pageOrientation: myCompanyDetails.pageOrientation || defaultDocumentSettings.pageOrientation,
        pageMargins: myCompanyDetails.pageMargins || defaultDocumentSettings.pageMargins,
        pageFontSize: myCompanyDetails.pageFontSize || defaultDocumentSettings.pageFontSize,
        addressFontSize: myCompanyDetails.addressFontSize || defaultDocumentSettings.addressFontSize,
        tableBodyFontSize: myCompanyDetails.tableBodyFontSize || defaultDocumentSettings.tableBodyFontSize,
    }
  }, [myCompanyDetails, defaultDocumentSettings]);
  
  const liveDefaultTemplate = useMemo((): InvoiceTemplate => {
      return myCompanyDetails?.template || defaultTemplate;
  }, [myCompanyDetails, defaultTemplate]);

  const resetForm = useCallback(() => {
      setCompanyId(initialFormState.companyId);
      setBillDate(initialFormState.billDate);
      setBillingMonth(initialFormState.billingMonth);
      setPoNumber(initialFormState.poNumber);
      setSite(initialFormState.site);
      setItems(initialFormState.items);
      setSelectedBankAccountId(initialFormState.selectedBankAccountId);
      setDiscount(initialFormState.discount);
      setDiscountType(initialFormState.discountType);
      setAdvanceReceived(initialFormState.advanceReceived);
      setTdsPercentage(initialFormState.tdsPercentage);
      setEditingInvoice(null);
      setInvoicePageSettings(liveDefaultPageSettings);
      setFormDownloadOptions(defaultDownloadOptions);
      setFormTemplate(liveDefaultTemplate);
  }, [initialFormState, liveDefaultPageSettings, liveDefaultTemplate, defaultDownloadOptions]);

  const openFormDialog = useCallback((invoice: Invoice | null) => {
    closeAllDialogs();
    if (invoice) {
      setEditingInvoice(invoice);
      setFormEnterprise(invoice.enterprise);
      setCompanyId(invoice.companyId);
      setBillDate(invoice.billDate);
      setBillingMonth(invoice.billingMonth || format(parseISO(invoice.billDate), 'yyyy-MM'));
      setPoNumber(invoice.poNumber || 'AGREEMENT');
      setSite(invoice.site || '');
      setItems(invoice.items.map((item, index) => ({ ...item, key: `item-${Date.now()}-${index}` })));
      setSelectedBankAccountId(invoice.selectedBankAccount?.id || 'no_bank');
      setDiscount(String(invoice.discount || ''));
      setDiscountType(invoice.discountType || 'after_gst');
      setAdvanceReceived(String(invoice.advanceReceived || ''));
      setTdsPercentage(String(invoice.tdsPercentage || ''));
      setInvoicePageSettings({
          pageSize: invoice.documentSettings?.pageSize || liveDefaultPageSettings.pageSize,
          pageOrientation: invoice.documentSettings?.pageOrientation || liveDefaultPageSettings.pageOrientation,
          pageMargins: invoice.documentSettings?.pageMargins || liveDefaultPageSettings.pageMargins,
          pageFontSize: invoice.documentSettings?.pageFontSize || liveDefaultPageSettings.pageFontSize,
          addressFontSize: invoice.documentSettings?.addressFontSize || liveDefaultPageSettings.addressFontSize,
          tableBodyFontSize: invoice.documentSettings?.tableBodyFontSize || liveDefaultPageSettings.tableBodyFontSize,
      });
      setFormDownloadOptions(invoice.downloadOptions || defaultDownloadOptions);
      setFormTemplate(invoice.template || liveDefaultTemplate);
    } else {
      resetForm();
      setFormEnterprise(activeTab);
    }
    handleDelayedAction(() => setIsFormDialogOpen(true));
  }, [ activeTab, liveDefaultPageSettings, defaultDownloadOptions, liveDefaultTemplate, resetForm, closeAllDialogs ]);


  const openPreviewDialog = useCallback((invoice: Invoice) => {
    closeAllDialogs();
    setInvoiceForPreview(invoice);
    handleDelayedAction(() => setIsPreviewOpen(true));
  }, [closeAllDialogs]);

  const openDeleteDialog = useCallback((invoice: Invoice) => {
    closeAllDialogs();
    handleDelayedAction(() => setInvoiceToDelete(invoice));
  }, [closeAllDialogs]);

  const openDuplicateDialog = useCallback((invoice: Invoice) => {
    closeAllDialogs();
    setNewBillDateForDuplicate(toISODateString(new Date()));
    handleDelayedAction(() => setInvoiceToDuplicate(invoice));
  }, [closeAllDialogs]);
  
  const openBulkDuplicateDialog = useCallback(() => {
    closeAllDialogs();
    handleDelayedAction(() => setIsBulkDuplicateDialogOpen(true));
  }, [closeAllDialogs]);


  const selectedCompanyForNewInvoice = useMemo(() => companies?.find(c => c.id === companyId), [companies, companyId]);

  
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
        size: invoice.documentSettings?.pageSize || liveDefaultPageSettings.pageSize || 'A4',
        orientation: invoice.documentSettings?.pageOrientation || liveDefaultPageSettings.pageOrientation || 'portrait',
        pageMargins: invoice.documentSettings?.pageMargins || liveDefaultPageSettings.pageMargins || { top: 1.27, right: 1.27, bottom: 1.27, left: 1.27 },
        pageFontSize: invoice.documentSettings?.pageFontSize || liveDefaultPageSettings.pageFontSize,
        addressFontSize: invoice.documentSettings?.addressFontSize || liveDefaultPageSettings.addressFontSize,
        tableBodyFontSize: invoice.documentSettings?.tableBodyFontSize || liveDefaultPageSettings.tableBodyFontSize,
    }

    try {
        await generateAndDownloadInvoice(invoice, invoice.clientCompanyDetails, invoice.myCompanyDetails, pageSettingsToUse, invoice.template, invoice.downloadOptions);
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Download Error',
            description: 'Could not generate Word document.',
        });
        console.error(e);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0 || !allInvoices) {
      toast({ variant: "destructive", title: "No Invoices Selected", description: "Please select invoices to download." });
      return;
    }

    const invoicesToDownload = allInvoices.filter(inv => selectedInvoices.includes(inv.id));
    toast({ title: "Download Started", description: `Downloading ${invoicesToDownload.length} invoices.` });

    for (const invoice of invoicesToDownload) {
      try {
        await handleDownloadWord(invoice);
        // Add a small delay between downloads to avoid browser issues
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        toast({ variant: "destructive", title: `Error Downloading Bill No. ${invoice.billNo}`, description: "This invoice might be missing required details." });
      }
    }
    
    setSelectedInvoices([]);
  };

  const filteredInvoices = useMemo(() => {
    return allInvoices?.filter(inv => inv.enterprise === activeTab) || [];
  }, [allInvoices, activeTab]);

  const maxBillNumber = useMemo(() => {
    if (!filteredInvoices || filteredInvoices.length === 0) return 0;
    return Math.max(0, ...filteredInvoices.map(inv => inv.billNo));
  }, [filteredInvoices]);
  
  const nextBillNumber = useMemo(() => {
    if (maxBillNumber === 0) {
      const targetSettings = activeTab === 'Vithal' ? vithalCompanyDetails : rvCompanyDetails;
      return targetSettings?.nextBillNo || 1;
    }
    return maxBillNumber + 1;
  }, [maxBillNumber, activeTab, vithalCompanyDetails, rvCompanyDetails]);
  
  const nextBillNumberForForm = useMemo(() => {
    if (!allInvoices) return 1;
    const targetInvoices = allInvoices.filter(inv => inv.enterprise === formEnterprise);
    const maxBillNumberForForm = Math.max(0, ...targetInvoices.map(inv => inv.billNo));
    
    if (maxBillNumberForForm === 0) {
      const targetSettings = formEnterprise === 'Vithal' ? vithalCompanyDetails : rvCompanyDetails;
      return targetSettings?.nextBillNo || 1;
    }
    
    return maxBillNumberForForm + 1;
  }, [formEnterprise, allInvoices, vithalCompanyDetails, rvCompanyDetails]);

  const skippedBillNumbersText = useMemo(() => {
    if (!filteredInvoices || filteredInvoices.length < 2) return null;

    const billNumbers = filteredInvoices.map(inv => inv.billNo).sort((a, b) => a - b);
    if (billNumbers.length === 0) return null;

    const min = billNumbers[0];
    const max = billNumbers[billNumbers.length - 1];
    const skipped = [];
    const numberSet = new Set(billNumbers);

    for (let i = min; i <= max; i++) {
      if (!numberSet.has(i)) {
        skipped.push(i);
      }
    }
    
    if (skipped.length === 0) return null;

    if (skipped.length > 5) {
        return `${skipped.slice(0, 5).join(', ')} and ${skipped.length - 5} more`;
    }
    
    return skipped.join(', ');

  }, [filteredInvoices]);


  const organizedInvoices = useMemo(() => {
    if (!filteredInvoices) return [];

    const getFinancialYear = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      // Financial year starts in April (month 3)
      return month >= 3 ? year : year - 1;
    };

    const groupedByYear = filteredInvoices.reduce((acc, invoice) => {
      const dateForGrouping = invoice.billingMonth ? parseISO(`${invoice.billingMonth}-01`) : parseISO(invoice.billDate);
      const financialYearStart = getFinancialYear(dateForGrouping);
      const yearKey = `${financialYearStart}-${financialYearStart + 1}`;
      
      if (!acc[yearKey]) {
        acc[yearKey] = [];
      }
      acc[yearKey].push(invoice);
      return acc;
    }, {} as Record<string, Invoice[]>);
    
    const sortedYearKeys = Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a));

    return sortedYearKeys.map((yearKey, index) => {
      const yearInvoices = groupedByYear[yearKey];
      const [startYear] = yearKey.split('-').map(Number);
      const endYear = startYear + 1;

      const minBill = Math.min(...yearInvoices.map(inv => inv.billNo));
      const maxBill = Math.max(...yearInvoices.map(inv => inv.billNo));
      
      const groupedByMonth = yearInvoices.reduce((acc, invoice) => {
        const monthKey = invoice.billingMonth || format(parseISO(invoice.billDate), 'yyyy-MM');
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
        
        // Sort invoices within the month by bill number ascending
        const sortedMonthInvoices = monthInvoices.sort((a,b) => a.billNo - b.billNo);

        return {
          key: monthKey,
          label: `${format(monthDate, 'MM-MMM yyyy').toUpperCase()} (BILL NO-${monthMinBill}-${monthMaxBill})`,
          invoices: sortedMonthInvoices,
        };
      }).sort((a, b) => a.key.localeCompare(b.key));

      return {
        key: yearKey,
        label: `${index + 1}-April ${startYear}-March ${endYear} (Bill-${minBill} to ${maxBill})`,
        months: months,
      };
    });

  }, [filteredInvoices]);


  const calculations = useMemo(() => {
    const netTotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const discountAmount = Number(String(discount).replace(/,/g, '')) || 0;
    const advanceAmount = Number(String(advanceReceived).replace(/,/g, '')) || 0;

    let taxableAmount = netTotal;
    if (discountType === 'before_gst' && discountAmount > 0) {
        taxableAmount = netTotal - discountAmount;
    }

    const cgst = taxableAmount * 0.09;
    const sgst = taxableAmount * 0.09;

    const totalBeforeFinalDiscount = taxableAmount + cgst + sgst;

    let finalGrandTotal = totalBeforeFinalDiscount;
    if (discountType === 'after_gst' && discountAmount > 0) {
        finalGrandTotal = totalBeforeFinalDiscount - discountAmount;
    }
    
    const grandTotal = Math.round(finalGrandTotal);
    const balanceDue = grandTotal - advanceAmount;

    return { netTotal, taxableAmount, cgst, sgst, grandTotal, balanceDue, discountAmount, advanceAmount };
  }, [items, discount, discountType, advanceReceived]);
  
  const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: true,
      ignoreZeroCurrency: false,
    }
  });

  const amountInWords = useMemo(() => {
    return toWords.convert(calculations.grandTotal).toUpperCase();
  },[calculations.grandTotal, toWords]);

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

  const applyMarkdown = (markdown: 'bold' | 'size', size?: number) => {
    if (!activeInput) return;

    const { key, field } = activeInput;
    const itemToUpdate = items.find(item => item.key === key);
    if (!itemToUpdate) return;
    
    const textarea = document.getElementById(`${field}-${key}`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    let newText;
    if (markdown === 'bold') {
        newText = `${value.substring(0, start)}**${selectedText}**${value.substring(end)}`;
    } else if (markdown === 'size' && size) {
        newText = `${value.substring(0, start)}<s:${size}>${selectedText}</s:${size}>${value.substring(end)}`;
    } else {
        return;
    }

    handleItemChange(key, field, newText);
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end + (markdown === 'bold' ? 4 : 7 + String(size).length * 2 + 3));
    }, 0);
  };
  
  const handleFormSubmit = async () => {
    if (!companyId || !billDate || !billingMonth || items.some(i => !i.particulars)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a company, date, billing month, and fill all invoice items.',
      });
      return;
    }
    
    const myCompanyDetailsForForm = formEnterprise === 'Vithal' ? vithalCompanyDetails : rvCompanyDetails;

    if (!myCompanyDetailsForForm && !editingInvoice) {
      toast({
        variant: 'destructive',
        title: 'Company Settings Missing',
        description: 'Your company details are not set. Please go to the Settings page to add them before creating an invoice.',
      });
      return;
    }
    
    let selectedBankAccount: BankAccount | undefined;
    if (selectedBankAccountId && selectedBankAccountId !== 'no_bank') {
        selectedBankAccount = bankAccounts?.find(b => b.id === selectedBankAccountId);
        if (!selectedBankAccount) {
            toast({ variant: 'destructive', title: 'Bank Account Error', description: 'Could not find the selected bank account.' });
            return;
        }
    }

    const settingsDocRef = formEnterprise === 'Vithal' ? vithalSettingsRef : rvSettingsRef;

    if (firestore && settingsDocRef) {
      const billNoToUse = editingInvoice ? editingInvoice.billNo : (nextBillNumberForForm || 1);

      if (isNaN(billNoToUse)) {
        toast({ variant: 'destructive', title: 'Invalid Bill Number', description: 'Could not determine next bill number.' });
        return;
      }
      
      const itemsToSave = items.map(({ key, ...rest }) => rest);
      
      const currentDocumentSettings: DocumentSettings = {
          pageSize: invoicePageSettings.pageSize,
          pageOrientation: invoicePageSettings.pageOrientation,
          pageMargins: {
            top: parseFloat(String(invoicePageSettings.pageMargins?.top || 0)) || 0,
            right: parseFloat(String(invoicePageSettings.pageMargins?.right || 0)) || 0,
            bottom: parseFloat(String(invoicePageSettings.pageMargins?.bottom || 0)) || 0,
            left: parseFloat(String(invoicePageSettings.pageMargins?.left || 0)) || 0,
          },
          pageFontSize: invoicePageSettings.pageFontSize,
          addressFontSize: invoicePageSettings.addressFontSize,
          tableBodyFontSize: invoicePageSettings.tableBodyFontSize,
        };

      const invoiceData: Omit<Invoice, 'id'> = {
        enterprise: formEnterprise,
        billNo: billNoToUse,
        billNoSuffix: 'MHE',
        billDate: billDate,
        billingMonth: billingMonth,
        companyId,
        poNumber,
        site,
        items: itemsToSave,
        netTotal: calculations.netTotal,
        cgst: calculations.cgst,
        sgst: calculations.sgst,
        grandTotal: calculations.grandTotal,
        tdsPercentage: Number(tdsPercentage) || 0,
        discount: calculations.discountAmount,
        discountType: discountType,
        advanceReceived: calculations.advanceAmount,
        myCompanyDetails: editingInvoice?.myCompanyDetails || myCompanyDetailsForForm!,
        clientCompanyDetails: editingInvoice?.clientCompanyDetails || selectedCompanyForNewInvoice!,
        selectedBankAccount: selectedBankAccount,
        documentSettings: currentDocumentSettings,
        downloadOptions: formDownloadOptions,
        template: formTemplate,
      };

      try {
        if (editingInvoice) {
          const invoiceDocRef = doc(firestore, 'invoices', editingInvoice.id);
          const dataForUpdate: {[key: string]: any} = {
            ...invoiceData,
            clientCompanyDetails: editingInvoice.clientCompanyDetails, // Preserve snapshot
            myCompanyDetails: editingInvoice.myCompanyDetails, // Preserve snapshot
          };

          if (!selectedBankAccount) {
            dataForUpdate.selectedBankAccount = deleteField();
          }

          updateDocumentNonBlocking(invoiceDocRef, dataForUpdate);

          toast({
              title: 'Invoice Updated',
              description: `Invoice No. ${invoiceData.billNo}-MHE has been updated.`,
          });
        } else {
          addDocumentNonBlocking(collection(firestore, 'invoices'), invoiceData);
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
  
  const handleConfirmDuplicate = () => {
    const settingsDocRef = activeTab === 'Vithal' ? vithalSettingsRef : rvSettingsRef;

    if (!invoiceToDuplicate || !firestore || !nextBillNumber || !settingsDocRef) {
        toast({ variant: "destructive", title: "Error", description: "Could not duplicate invoice. Please try again." });
        return;
    }

    const { id, billNo, billDate, ...restOfInvoice } = invoiceToDuplicate;

    const duplicatedInvoiceData: Omit<Invoice, 'id'> = {
        ...restOfInvoice,
        billNo: nextBillNumber,
        billDate: newBillDateForDuplicate,
        billingMonth: format(parseISO(newBillDateForDuplicate), 'yyyy-MM'),
        enterprise: activeTab,
    };
    
    addDocumentNonBlocking(collection(firestore, 'invoices'), duplicatedInvoiceData);

    toast({
        title: "Invoice Duplicated",
        description: `New invoice No. ${nextBillNumber}-MHE created.`,
    });
    setInvoiceToDuplicate(null);
  };
  
  const handleConfirmBulkDuplicate = async () => {
    if (!firestore || !nextBillNumber || selectedInvoices.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "Could not duplicate invoices. Please try again." });
        return;
    }

    const batch = writeBatch(firestore);
    const invoicesToDuplicate = selectedInvoices.map(id => allInvoices?.find(inv => inv.id === id)).filter((inv): inv is Invoice => !!inv);

    let currentBillNumber = nextBillNumber;

    for (const invoice of invoicesToDuplicate) {
        const { id, billNo, billDate, ...restOfInvoice } = invoice;
        const newInvoiceRef = doc(collection(firestore, 'invoices'));
        batch.set(newInvoiceRef, {
            ...restOfInvoice,
            billNo: currentBillNumber,
            billDate: newBillDateForBulk,
            billingMonth: format(parseISO(newBillDateForBulk), 'yyyy-MM'),
            enterprise: activeTab,
        });
        currentBillNumber++;
    }
    
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
      if (/^(\d*\.?\d*)?$/.test(value)) {
        setGlobalPageSettings(prev => ({
            ...prev,
            pageMargins: {
                ...(prev.pageMargins || {top:0,left:0,bottom:0,right:0}),
                [field]: value
            }
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
    const settingsDocRef = activeTab === 'Vithal' ? vithalSettingsRef : rvSettingsRef;
    if (!firestore || !settingsDocRef) return;
    setIsSubmittingSettings(true);

    const settingsToSave = JSON.parse(JSON.stringify(globalPageSettings));
    if (settingsToSave.pageMargins) {
        settingsToSave.pageMargins.top = parseFloat(String(settingsToSave.pageMargins.top)) || 0;
        settingsToSave.pageMargins.right = parseFloat(String(settingsToSave.pageMargins.right)) || 0;
        settingsToSave.pageMargins.bottom = parseFloat(String(settingsToSave.pageMargins.bottom)) || 0;
        settingsToSave.pageMargins.left = parseFloat(String(settingsToSave.pageMargins.left)) || 0;
    }

    try {
        await setDoc(settingsDocRef, settingsToSave, { merge: true });
        toast({ title: "Success", description: "Default settings updated." });
        setIsSettingsPopoverOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save default settings.' });
    } finally {
        setIsSubmittingSettings(false);
    }
  };
  
  const handleTemplateChange = (id: string, align: 'left' | 'center' | 'right') => {
    setFormTemplate(prev => ({
        ...prev,
        columns: prev.columns.map(col => col.id === id ? { ...col, align } : col)
    }));
  };

  const handleTemplateFontSizeChange = (id: string, size: string) => {
    const numValue = size === '' ? undefined : parseInt(size, 10);
    if (size === '' || (numValue !== undefined && !isNaN(numValue))) {
        setFormTemplate(prev => ({
            ...prev,
            columns: prev.columns.map(col => col.id === id ? { ...col, fontSize: numValue } : col)
        }));
    }
};

  const handleDocSettingsChange = useCallback((field: keyof DocumentSettings, value: any) => {
    setInvoicePageSettings(prev => ({...prev, [field]: value}));
  }, []);

  const handleDocMarginChange = useCallback((field: keyof PageMargin, value: string) => {
    if (/^(\d*\.?\d*)?$/.test(value)) {
        setInvoicePageSettings(prev => ({
            ...prev,
            pageMargins: {
                ...(prev.pageMargins || {top:0,left:0,bottom:0,right:0}),
                [field]: value
            }
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

  const getCompanyDisplay = (invoice: Invoice) => {
    const companyName = invoice.clientCompanyDetails?.name || 'Unknown';
    if (invoice.site && invoice.downloadOptions?.includeSiteInFilename) {
      return `${companyName} - ${invoice.site}`;
    }
    return companyName;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Enterprise)} className="w-full">
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
                                    <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download ({selectedInvoices.length})
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={openBulkDuplicateDialog}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate ({selectedInvoices.length})
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedInvoices([])} className="h-9 w-9">
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Clear selection</span>
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
                                        <p className="text-sm text-muted-foreground">Set the default layout for new invoices for <span className="font-bold">{activeTab} Enterprises</span>.</p>
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
                            <Button onClick={() => openFormDialog(null)} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Invoice
                            </Button>
                        </div>
                    </div>
                     <TabsList className="grid w-full grid-cols-2 mt-4">
                        <TabsTrigger value="Vithal">Vithal Enterprises</TabsTrigger>
                        <TabsTrigger value="RV">R.V Enterprises</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/40">
                        <div className="flex-1 w-full sm:w-auto">
                            <Label htmlFor="invoiceStart" className="text-sm font-medium">Next Invoice Number for {activeTab} Enterprises</Label>
                            <p className="text-xs text-muted-foreground">The next bill number will be automatically set to <span className='font-bold'>{nextBillNumber || '1'}</span>.</p>
                            {skippedBillNumbersText && (
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 flex items-center">
                                    <AlertTriangle className="inline-block h-4 w-4 mr-1.5 shrink-0" />
                                    <span>Note: Some bill numbers may be skipped: {skippedBillNumbersText}.</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <TabsContent value="Vithal">
                      <InvoiceList 
                        invoices={organizedInvoices}
                        isLoadingInvoices={isLoadingInvoices}
                        openYearAccordions={openYearAccordions}
                        setOpenYearAccordions={setOpenYearAccordions}
                        openMonthAccordions={openMonthAccordions}
                        setOpenMonthAccordions={setOpenMonthAccordions}
                        selectedInvoices={selectedInvoices}
                        handleSelectInvoice={handleSelectInvoice}
                        getCompanyDisplay={getCompanyDisplay}
                        openPreviewDialog={openPreviewDialog}
                        handleDownloadWord={handleDownloadWord}
                        openFormDialog={openFormDialog}
                        openDuplicateDialog={openDuplicateDialog}
                        openDeleteDialog={openDeleteDialog}
                      />
                    </TabsContent>
                    <TabsContent value="RV">
                      <InvoiceList 
                        invoices={organizedInvoices}
                        isLoadingInvoices={isLoadingInvoices}
                        openYearAccordions={openYearAccordions}
                        setOpenYearAccordions={setOpenYearAccordions}
                        openMonthAccordions={openMonthAccordions}
                        setOpenMonthAccordions={setOpenMonthAccordions}
                        selectedInvoices={selectedInvoices}
                        handleSelectInvoice={handleSelectInvoice}
                        getCompanyDisplay={getCompanyDisplay}
                        openPreviewDialog={openPreviewDialog}
                        handleDownloadWord={handleDownloadWord}
                        openFormDialog={openFormDialog}
                        openDuplicateDialog={openDuplicateDialog}
                        openDeleteDialog={openDeleteDialog}
                      />
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>

        <Dialog open={isFormDialogOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pr-14 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <DialogTitle>
                                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingInvoice ? `Updating Invoice No. ${editingInvoice.billNo}-MHE` : `Creating a new invoice for ${formEnterprise} Enterprises.`}
                            </DialogDescription>
                        </div>
                        {!editingInvoice && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="ml-4 shrink-0">
                                        {formEnterprise}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuRadioGroup value={formEnterprise} onValueChange={(value) => setFormEnterprise(value as Enterprise)}>
                                        <DropdownMenuRadioItem value="Vithal">Vithal</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="RV">RV</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto px-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
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
                                <Label htmlFor="billingMonth">Billing Month</Label>
                                <Input
                                    id="billingMonth"
                                    type="month"
                                    value={billingMonth}
                                    onChange={(e) => setBillingMonth(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="bankAccount">Bank Account</Label>
                                <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId} disabled={isLoadingBankAccounts}>
                                    <SelectTrigger id="bankAccount">
                                        <SelectValue placeholder="Select bank account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingBankAccounts ? (
                                            <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                                        ) : (
                                            <>
                                                <SelectItem value="no_bank">No Bank</SelectItem>
                                                {bankAccounts?.map(account => (
                                                    <SelectItem key={account.id} value={account.id}>{account.nickname}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="poNumber">PO.NO</Label>
                                <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="site">Site</Label>
                                <Input id="site" value={site} onChange={e => setSite(e.target.value)} placeholder="e.g., THANE DEPOT" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Particulars</Label>
                                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/50">
                                    <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => applyMarkdown('bold')}>
                                        <Bold className="h-4 w-4" />
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" variant="outline" className="h-7 px-2 text-xs">
                                                <Pilcrow className="h-4 w-4 mr-1" />
                                                Font Size
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuRadioGroup onValueChange={(size) => applyMarkdown('size', parseInt(size, 10))}>
                                                {[9, 10, 11, 12, 14].map(s => (
                                                    <DropdownMenuRadioItem key={s} value={String(s)}>{s} pt</DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {items.map((item, index) => (
                                <div key={item.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <AutoHeightTextarea
                                        id={`particulars-${item.key}`}
                                        value={item.particulars}
                                        onChange={(e) => handleItemChange(item.key, 'particulars', e.target.value)}
                                        onFocus={() => setActiveInput({ key: item.key, field: 'particulars' })}
                                        placeholder="Item description"
                                        className="flex-grow resize-none overflow-hidden"
                                        rows={1}
                                    />
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <AutoHeightTextarea
                                            id={`rate-${item.key}`}
                                            value={item.rate || ''}
                                            onChange={(e) => handleItemChange(item.key, 'rate', e.target.value)}
                                            onFocus={() => setActiveInput({ key: item.key, field: 'rate' })}
                                            placeholder="Rate"
                                            className="w-full sm:w-40 resize-none overflow-hidden"
                                            rows={1}
                                        />
                                        <Input
                                            type="text"
                                            placeholder="Amount"
                                            value={item.amount ? new Intl.NumberFormat('en-IN').format(item.amount) : (item.amount === 0 ? '0' : '')}
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-4">
                               <div className="space-y-2">
                                    <Label htmlFor="discount">Discount</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="discount"
                                            type="text"
                                            placeholder="Enter discount amount" 
                                            value={discount} 
                                            onChange={(e) => setDiscount(e.target.value)}
                                            className="flex-1"
                                        />
                                        <RadioGroup value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)} className="flex items-center gap-2 rounded-md border p-1 h-10 bg-muted/50">
                                            <Label htmlFor="before_gst" className={cn("flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded-sm", discountType === 'before_gst' && "bg-background shadow")}>
                                                <RadioGroupItem value="before_gst" id="before_gst" className="sr-only"/>
                                                Before GST
                                            </Label>
                                            <Label htmlFor="after_gst" className={cn("flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded-sm", discountType === 'after_gst' && "bg-background shadow")}>
                                                <RadioGroupItem value="after_gst" id="after_gst" className="sr-only"/>
                                                After GST
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="advanceReceived">Advance Received</Label>
                                    <Input 
                                        id="advanceReceived" 
                                        type="text"
                                        placeholder="Enter advance amount" 
                                        value={advanceReceived} 
                                        onChange={(e) => setAdvanceReceived(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tdsPercentage">TDS Percentage (%)</Label>
                                    <Input 
                                        id="tdsPercentage" 
                                        type="number"
                                        placeholder="e.g., 2" 
                                        value={tdsPercentage} 
                                        onChange={(e) => setTdsPercentage(e.target.value)} 
                                    />
                                </div>
                            </div>
                           <div className="w-full space-y-2 pt-2 self-end">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Net Total</span>
                                    <span>{calculations.netTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                </div>

                                {discountType === 'before_gst' && calculations.discountAmount > 0 && (
                                    <div className="flex justify-between text-destructive">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span>- {calculations.discountAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                    </div>
                                )}
                                
                                {discountType === 'before_gst' && calculations.discountAmount > 0 && (
                                    <>
                                    <Separator/>
                                    <div className="flex justify-between font-medium">
                                        <span className="text-muted-foreground">Taxable Amount</span>
                                        <span>{calculations.taxableAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                    </div>
                                    <Separator/>
                                    </>
                                )}

                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">CGST @ 9%</span>
                                    <span>{calculations.cgst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">SGST @ 9%</span>
                                    <span>{calculations.sgst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                </div>
                                
                                {discountType === 'after_gst' && calculations.discountAmount > 0 && (
                                    <div className="flex justify-between text-destructive">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span>- {calculations.discountAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>{calculations.advanceAmount > 0 ? 'Grand Total' : 'Total Amount Payable'}</span>
                                    <span>{calculations.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                </div>
                                {calculations.advanceAmount > 0 && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Advance Received</span>
                                            <span>- {calculations.advanceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total Amount Payable</span>
                                            <span>{calculations.balanceDue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                        </div>
                                    </>
                                )}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                     <div className="p-4 border rounded-lg">
                                      <ColumnAlignmentFields template={formTemplate} onTemplateChange={handleTemplateChange} onTemplateFontSizeChange={handleTemplateFontSizeChange} items={items} />
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

        <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && closeAllDialogs()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete Invoice No. <span className="font-medium">{invoiceToDelete?.billNo}-MHE</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteInvoice(); }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!invoiceToDuplicate} onOpenChange={(open) => !open && closeAllDialogs()}>
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

        <AlertDialog open={isBulkDuplicateDialogOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
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
        
        <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
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
