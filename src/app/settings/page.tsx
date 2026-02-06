
'use client';
import { useCallback, useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, setDoc, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanySettings, PageMargin, BankAccount, InvoiceTemplate } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BankAccountForm, BankAccountFormData } from "@/components/bank-account-form";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { EllipsisVertical, Pencil, PlusCircle, Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type Enterprise = 'Vithal' | 'RV';

const ColumnAlignmentFields = ({ template, onTemplateChange, onTemplateFontSizeChange }: { 
    template: InvoiceTemplate, 
    onTemplateChange: (id: 'sr_no' | 'particulars' | 'rate' | 'amount', align: 'left' | 'center' | 'right') => void,
    onTemplateFontSizeChange: (id: 'sr_no' | 'particulars' | 'rate' | 'amount', size: string) => void,
}) => {
    return (
        <div className="space-y-4">
             <h4 className="font-semibold text-foreground">Default Column Styles</h4>
             <div className="space-y-4">
             {template.columns.map(col => (
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
                                    onClick={() => onTemplateChange(col.id as 'sr_no' | 'particulars' | 'rate' | 'amount', align)}
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
                            onChange={(e) => onTemplateFontSizeChange(col.id as 'sr_no' | 'particulars' | 'rate' | 'amount', e.target.value)}
                            className="h-9 w-20"
                        />
                    </div>
                </div>
             ))}
             </div>
        </div>
    );
};

const SettingsForm = ({ enterprise }: { enterprise: Enterprise }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    
    const settingsDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, "companySettings", enterprise.toLowerCase())
    }, [firestore, enterprise, user]);
    const { data: initialSettings, isLoading: isLoadingSettings } = useDoc<CompanySettings>(settingsDocRef);
    
    const [settings, setSettings] = useState<Partial<CompanySettings>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

     const defaultTemplate: InvoiceTemplate = {
      columns: [
          { id: 'sr_no', label: 'Sr. No', align: 'center' },
          { id: 'particulars', label: 'Particulars', align: 'left' },
          { id: 'rate', label: 'Rate', align: 'right' },
          { id: 'amount', label: 'Amount', align: 'right' },
      ],
    };

    const settingsWithTemplate = useMemo(() => {
        return {
            ...settings,
            template: settings.template || defaultTemplate
        }
    }, [settings, defaultTemplate]);
    
    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        } else {
            setSettings({});
        }
    }, [initialSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        if (type === 'number') {
            const numValue = value === '' ? null : parseFloat(value);
            if (numValue === null || !isNaN(numValue as number)) {
                setSettings(prev => ({ ...prev, [id]: numValue }));
            }
        } else {
            setSettings(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleSelectChange = (id: keyof CompanySettings, value: string) => {
        setSettings(prev => ({...prev, [id]: value}));
    }
    
    const handleMarginChange = (field: keyof PageMargin, value: string) => {
      const numValue = value === '' ? null : parseFloat(value);
       if (numValue === null || !isNaN(numValue as number)) {
        setSettings(prev => ({
            ...prev,
            pageMargins: { ...(prev.pageMargins || {top: 0, right: 0, bottom: 0, left: 0}), [field]: numValue }
        }));
      }
    }
    
    const handleFontSizeChange = (field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => {
        const numValue = value === '' ? null : parseInt(value, 10);
        if (numValue === null || !isNaN(numValue as number)) {
            setSettings(p => ({...p, [field]: numValue}));
        }
    }

     const handleTemplateChange = (id: 'sr_no' | 'particulars' | 'rate' | 'amount', align: 'left' | 'center' | 'right') => {
        setSettings(prev => ({
            ...prev,
            template: {
                ...(prev.template || defaultTemplate),
                columns: (prev.template?.columns || defaultTemplate.columns).map(col =>
                    col.id === id ? { ...col, align } : col
                ),
            },
        }));
    };

    const handleTemplateFontSizeChange = (id: 'sr_no' | 'particulars' | 'rate' | 'amount', size: string) => {
        const numValue = size === '' ? undefined : parseInt(size, 10);
        if (size === '' || (numValue !== undefined && !isNaN(numValue))) {
            setSettings(prev => ({
                ...prev,
                template: {
                    ...(prev.template || defaultTemplate),
                    columns: (prev.template?.columns || defaultTemplate.columns).map(col =>
                        col.id === id ? { ...col, fontSize: numValue } : col
                    ),
                },
            }));
        }
    };


    const handleSaveChanges = async () => {
        if (!firestore || !settingsDocRef) {
            toast({ variant: "destructive", title: "Error", description: "Could not connect to database." });
            return;
        }
        
        setIsSubmitting(true);
        try {
            await setDoc(settingsDocRef, settings, { merge: true });
            toast({ title: "Success", description: `${enterprise} settings updated successfully.` });
        } catch (error) {
            console.error("Error updating settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update settings. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoadingSettings) {
        return (
             <div className="space-y-8">
               <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input id="companyName" value={settings.companyName || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pan">PAN Number</Label>
                        <Input id="pan" value={settings.pan || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstin">GSTIN</Label>
                        <Input id="gstin" value={settings.gstin || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sacCode">SAC Code</Label>
                        <Input id="sacCode" value={settings.sacCode || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="serviceTaxCode">Service Tax Code No</Label>
                        <Input id="serviceTaxCode" value={settings.serviceTaxCode || ''} onChange={handleInputChange} />
                    </div>
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Person</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">Full Name</Label>
                        <Input id="contactPerson" value={settings.contactPerson || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <Input id="contactNumber" value={settings.contactNumber || ''} onChange={handleInputChange} />
                    </div>
                </div>
            </div>
            
            <Separator />

            <div className="space-y-6">
                <h3 className="text-lg font-medium">Default Invoice & Document Settings</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="nextBillNo">Next Invoice Number</Label>
                        <Input id="nextBillNo" type="number" value={settings.nextBillNo ?? ''} onChange={handleInputChange} />
                    </div>
                 </div>
                 <div className="space-y-4 pt-2">
                    <Label>Default Document Layout</Label>
                    <div className="p-4 border rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         <div className="grid grid-cols-1 items-center gap-4">
                            <Label>Page Size</Label>
                            <Select value={settings.pageSize || 'A4'} onValueChange={(value) => handleSelectChange('pageSize', value)} >
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select page size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A4">A4</SelectItem>
                                    <SelectItem value="LETTER">Letter</SelectItem>
                                    <SelectItem value="LEGAL">Legal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid items-start gap-4">
                            <Label>Margins (cm)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="number" placeholder="Top" value={settings.pageMargins?.top ?? ''} onChange={(e) => handleMarginChange('top', e.target.value)} className="h-8"/>
                                <Input type="number" placeholder="Bottom" value={settings.pageMargins?.bottom ?? ''} onChange={(e) => handleMarginChange('bottom', e.target.value)} className="h-8"/>
                                <Input type="number" placeholder="Left" value={settings.pageMargins?.left ?? ''} onChange={(e) => handleMarginChange('left', e.target.value)} className="h-8"/>
                                <Input type="number" placeholder="Right" value={settings.pageMargins?.right ?? ''} onChange={(e) => handleMarginChange('right', e.target.value)} className="h-8"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 items-center gap-4">
                            <Label>Page Font</Label>
                            <Input type="number" value={settings.pageFontSize ?? ''} onChange={e => handleFontSizeChange('pageFontSize', e.target.value)} className="h-8" placeholder="e.g., 11"/>
                        </div>
                        <div className="grid grid-cols-1 items-center gap-4">
                            <Label>Address Font</Label>
                            <Input type="number" value={settings.addressFontSize ?? ''} onChange={e => handleFontSizeChange('addressFontSize', e.target.value)} className="h-8" placeholder="e.g., 10"/>
                        </div>
                        <div className="grid grid-cols-1 items-center gap-4">
                            <Label>Table Font</Label>
                            <Input type="number" value={settings.tableBodyFontSize ?? ''} onChange={e => handleFontSizeChange('tableBodyFontSize', e.target.value)} className="h-8" placeholder="e.g., 11"/>
                        </div>
                        <div className="lg:col-span-3">
                            <Separator className="my-4"/>
                            <ColumnAlignmentFields template={settingsWithTemplate.template} onTemplateChange={handleTemplateChange} onTemplateFontSizeChange={handleTemplateFontSizeChange} />
                        </div>
                    </div>
                 </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : `Save ${enterprise} Settings`}
                </Button>
            </div>
        </div>
    );
}


export default function SettingsPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [activeBankTab, setActiveBankTab] = useState<Enterprise>('Vithal');
    
    const bankAccountsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, "companySettings", activeBankTab.toLowerCase(), "bankAccounts"), orderBy('nickname'));
    }, [firestore, user, activeBankTab]);
    const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
    
    const [isBankAccountDialogOpen, setIsBankAccountDialogOpen] = useState(false);
    const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
    const [bankAccountToDelete, setBankAccountToDelete] = useState<BankAccount | null>(null);

    
    const closeAllDialogs = useCallback(() => {
        setIsBankAccountDialogOpen(false);
        setBankAccountToDelete(null);
    }, []);

    const handleDelayedAction = (action: () => void) => {
        setTimeout(action, 100);
    };
    
    const openBankAccountDialog = useCallback((bankAccount: BankAccount | null) => {
        closeAllDialogs();
        setSelectedBankAccount(bankAccount);
        handleDelayedAction(() => setIsBankAccountDialogOpen(true));
    }, [closeAllDialogs]);

    const handleBankAccountFormSubmit = (formData: BankAccountFormData) => {
        if (!firestore) return;

        const bankAccountsCollectionRef = collection(firestore, "companySettings", activeBankTab.toLowerCase(), "bankAccounts");
        
        if (selectedBankAccount) { // Edit mode
            const accountDocRef = doc(bankAccountsCollectionRef, selectedBankAccount.id);
            updateDocumentNonBlocking(accountDocRef, formData);
            toast({ title: "Success", description: "Bank account updated." });
        } else { // Add mode
            addDocumentNonBlocking(bankAccountsCollectionRef, formData);
            toast({ title: "Success", description: "Bank account added." });
        }
        setIsBankAccountDialogOpen(false);
    };
    
    const openDeleteDialog = useCallback((bankAccount: BankAccount) => {
        closeAllDialogs();
        handleDelayedAction(() => setBankAccountToDelete(bankAccount));
    }, [closeAllDialogs]);
    
    const handleDeleteBankAccount = () => {
        if (!firestore || !bankAccountToDelete) return;
        const accountDocRef = doc(firestore, "companySettings", activeBankTab.toLowerCase(), "bankAccounts", bankAccountToDelete.id);
        deleteDocumentNonBlocking(accountDocRef);
        toast({ title: "Bank Account Deleted", description: `${bankAccountToDelete.nickname} has been removed.` });
        setBankAccountToDelete(null);
    }
    
    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Enterprise Settings</CardTitle>
                        <CardDescription>
                            Manage settings for each of your enterprises.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Tabs defaultValue="Vithal" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="Vithal">Vithal Enterprises</TabsTrigger>
                                <TabsTrigger value="RV">R.V Enterprises</TabsTrigger>
                            </TabsList>
                            <TabsContent value="Vithal" className="pt-6">
                                <SettingsForm enterprise="Vithal" />
                            </TabsContent>
                            <TabsContent value="RV" className="pt-6">
                                <SettingsForm enterprise="RV" />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Bank Accounts</CardTitle>
                                <CardDescription>Manage your company's bank accounts for each enterprise.</CardDescription>
                            </div>
                            <Button onClick={() => openBankAccountDialog(null)} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Bank Account
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeBankTab} onValueChange={(value) => setActiveBankTab(value as Enterprise)}>
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="Vithal">Vithal Bank Accounts</TabsTrigger>
                                <TabsTrigger value="RV">R.V Bank Accounts</TabsTrigger>
                            </TabsList>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nickname</TableHead>
                                        <TableHead>Bank</TableHead>
                                        <TableHead>Account Number</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingBankAccounts ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                                    ) : bankAccounts && bankAccounts.length > 0 ? (
                                        bankAccounts.map(account => (
                                            <TableRow key={account.id}>
                                                <TableCell className="font-medium">{account.nickname}</TableCell>
                                                <TableCell>{account.bankName}</TableCell>
                                                <TableCell>{account.accountNumber}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                                <EllipsisVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => openBankAccountDialog(account)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => openDeleteDialog(account)} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">No bank accounts added for {activeBankTab}.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isBankAccountDialogOpen} onOpenChange={(open) => {if(!open) closeAllDialogs(); else setIsBankAccountDialogOpen(true); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedBankAccount ? 'Edit Bank Account' : `Add New ${activeBankTab} Bank Account`}</DialogTitle>
                        <DialogDescription>
                            {selectedBankAccount ? 'Update the details for this bank account.' : 'Fill in the details for the new bank account.'}
                        </DialogDescription>
                    </DialogHeader>
                    <BankAccountForm 
                        onSubmit={handleBankAccountFormSubmit}
                        onCancel={() => setIsBankAccountDialogOpen(false)}
                        initialData={selectedBankAccount || undefined}
                        mode={selectedBankAccount ? 'edit' : 'add'}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!bankAccountToDelete} onOpenChange={(open) => !open && closeAllDialogs()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the bank account: <span className="font-bold">{bankAccountToDelete?.nickname}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBankAccount}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </AppLayout>
    );
}
