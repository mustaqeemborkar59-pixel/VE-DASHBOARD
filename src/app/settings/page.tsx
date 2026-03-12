
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BankAccountForm, BankAccountFormData } from "@/components/bank-account-form";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { EllipsisVertical, Pencil, PlusCircle, Trash2, AlignLeft, AlignCenter, AlignRight, Send, Loader2, CheckCircle2, RefreshCw, Building2, CreditCard, LayoutTemplate, Settings2, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { setupTelegramWebhook } from "@/app/actions/telegram";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


type Enterprise = 'Vithal' | 'RV';

const ColumnAlignmentFields = ({ template, onTemplateChange, onTemplateFontSizeChange }: { 
    template: InvoiceTemplate, 
    onTemplateChange: (id: 'sr_no' | 'particulars' | 'rate' | 'amount', align: 'left' | 'center' | 'right') => void,
    onTemplateFontSizeChange: (id: 'sr_no' | 'particulars' | 'rate' | 'amount', size: string) => void,
}) => {
    return (
        <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <LayoutTemplate className="h-3 w-3" /> Default Column Styles
             </h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {template.columns.map(col => (
                <div key={col.id} className="p-3 rounded-xl border bg-muted/20 space-y-3">
                    <Label className="text-[9px] font-bold uppercase">{col.label}</Label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 p-1 bg-background rounded-lg border flex items-center justify-between">
                            {(['left', 'center', 'right'] as const).map(align => (
                                <Button 
                                    key={align} 
                                    type="button" 
                                    variant={col.align === align ? 'default' : 'ghost'} 
                                    size="icon" 
                                    className="h-7 w-7 flex-1 rounded-md"
                                    onClick={() => onTemplateChange(col.id as 'sr_no' | 'particulars' | 'rate' | 'amount', align)}
                                >
                                    {align === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
                                    {align === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
                                    {align === 'right' && <AlignRight className="h-3.5 w-3.5" />}
                                </Button>
                            ))}
                        </div>
                         <Input 
                            type="number" 
                            placeholder="Size" 
                            value={col.fontSize ?? ''} 
                            onChange={(e) => onTemplateFontSizeChange(col.id as 'sr_no' | 'particulars' | 'rate' | 'amount', e.target.value)}
                            className="h-9 w-14 text-center font-bold text-xs"
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target as HTMLInputElement;
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
             <div className="space-y-8 p-4">
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
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Basic Information
                </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-[9px] font-bold uppercase text-muted-foreground">Company Name</Label>
                        <Input id="companyName" value={settings.companyName || ''} onChange={handleInputChange} className="h-10 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-[9px] font-bold uppercase text-muted-foreground">Registered Address</Label>
                        <Textarea id="address" value={settings.address || ''} onChange={handleInputChange} placeholder="Full address for documents" className="min-h-[80px] rounded-xl resize-none text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pan" className="text-[9px] font-bold uppercase text-muted-foreground">PAN Number</Label>
                        <Input id="pan" value={settings.pan || ''} onChange={handleInputChange} className="h-10 rounded-xl font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstin" className="text-[9px] font-bold uppercase text-muted-foreground">GSTIN</Label>
                        <Input id="gstin" value={settings.gstin || ''} onChange={handleInputChange} className="h-10 rounded-xl font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sacCode" className="text-[9px] font-bold uppercase text-muted-foreground">SAC Code</Label>
                        <Input id="sacCode" value={settings.sacCode || ''} onChange={handleInputChange} className="h-10 rounded-xl font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="serviceTaxCode" className="text-[9px] font-bold uppercase text-muted-foreground">Service Tax Code No</Label>
                        <Input id="serviceTaxCode" value={settings.serviceTaxCode || ''} onChange={handleInputChange} className="h-10 rounded-xl font-mono text-xs" />
                    </div>
                </div>
            </div>

            <Separator className="bg-border/50" />
            
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" /> Contact & Billing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson" className="text-[9px] font-bold uppercase text-muted-foreground">Contact Person</Label>
                        <Input id="contactPerson" value={settings.contactPerson || ''} onChange={handleInputChange} className="h-10 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="text-[9px] font-bold uppercase text-muted-foreground">Contact Number</Label>
                        <Input id="contactNumber" value={settings.contactNumber || ''} onChange={handleInputChange} className="h-10 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nextBillNo" className="text-[9px] font-bold uppercase text-muted-foreground">Next Invoice Number</Label>
                        <Input id="nextBillNo" type="number" value={settings.nextBillNo ?? ''} onChange={handleInputChange} className="h-10 rounded-xl font-bold text-blue-600 text-xs" />
                    </div>
                </div>
            </div>
            
            <Separator className="bg-border/50" />

            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <LayoutTemplate className="h-3.5 w-3.5" /> Document Layout Defaults
                </h3>
                 <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <div className="p-4 sm:p-5 border rounded-2xl bg-muted/10 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Page Size</Label>
                                <Select value={settings.pageSize || 'A4'} onValueChange={(value) => handleSelectChange('pageSize', value)} >
                                    <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                                        <SelectValue placeholder="Select page size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A4" className="text-xs">A4</SelectItem>
                                        <SelectItem value="LETTER" className="text-xs">Letter</SelectItem>
                                        <SelectItem value="LEGAL" className="text-xs">Legal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Margins (cm)</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <Input type="number" placeholder="Top" value={settings.pageMargins?.top ?? ''} onChange={(e) => handleMarginChange('top', e.target.value)} className="h-9 rounded-xl px-1 text-center text-[10px]"/>
                                        <span className="text-[7px] text-center block text-muted-foreground uppercase font-bold">Top</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Input type="number" placeholder="Btm" value={settings.pageMargins?.bottom ?? ''} onChange={(e) => handleMarginChange('bottom', e.target.value)} className="h-9 rounded-xl px-1 text-center text-[10px]"/>
                                        <span className="text-[7px] text-center block text-muted-foreground uppercase font-bold">Btm</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Input type="number" placeholder="Left" value={settings.pageMargins?.left ?? ''} onChange={(e) => handleMarginChange('left', e.target.value)} className="h-9 rounded-xl px-1 text-center text-[10px]"/>
                                        <span className="text-[7px] text-center block text-muted-foreground uppercase font-bold">Left</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Input type="number" placeholder="Right" value={settings.pageMargins?.right ?? ''} onChange={(e) => handleMarginChange('right', e.target.value)} className="h-9 rounded-xl px-1 text-center text-[10px]"/>
                                        <span className="text-[7px] text-center block text-muted-foreground uppercase font-bold">Right</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Page Font</Label>
                                <Input type="number" value={settings.pageFontSize ?? ''} onChange={e => handleFontSizeChange('pageFontSize', e.target.value)} className="h-9 rounded-xl text-center font-bold text-xs" placeholder="11"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Address Font Size</Label>
                                <Input type="number" value={settings.addressFontSize ?? ''} onChange={e => handleFontSizeChange('addressFontSize', e.target.value)} className="h-9 rounded-xl text-xs" placeholder="10"/>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Table Body Font Size</Label>
                                <Input type="number" value={settings.tableBodyFontSize ?? ''} onChange={e => handleFontSizeChange('tableBodyFontSize', e.target.value)} className="h-9 rounded-xl text-xs" placeholder="11"/>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />
                        <ColumnAlignmentFields template={settingsWithTemplate.template} onTemplateChange={handleTemplateChange} onTemplateFontSizeChange={handleTemplateFontSizeChange} />
                    </div>
                 </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => window.location.reload()} className="h-11 rounded-2xl font-bold text-muted-foreground px-8 order-2 sm:order-1 text-xs">Discard</Button>
                <Button onClick={handleSaveChanges} disabled={isSubmitting} className="h-11 rounded-2xl font-bold px-10 shadow-lg shadow-primary/20 order-1 sm:order-2 text-xs">
                    {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving...</> : `Save ${enterprise} Settings`}
                </Button>
            </div>
        </div>
    );
}


export default function SettingsPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [activeBankTab, setActiveBankTab] = useState<Enterprise>('Vithal');
    
    // Telegram State
    const [isBotSettingUp, setIsBotSettingUp] = useState(false);
    const [botReady, setBotBotReady] = useState(false);

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
        setSelectedBankAccount(bankAccount);
        setIsBankAccountDialogOpen(true);
    }, []);

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
        setBankAccountToDelete(bankAccount);
    }, []);
    
    const handleDeleteBankAccount = () => {
        if (!firestore || !bankAccountToDelete) return;
        const accountDocRef = doc(firestore, "companySettings", activeBankTab.toLowerCase(), "bankAccounts", bankAccountToDelete.id);
        deleteDocumentNonBlocking(accountDocRef);
        toast({ title: "Bank Account Deleted", description: `${bankAccountToDelete.nickname} has been removed.` });
        setBankAccountToDelete(null);
    }

    const handleInitTelegram = async () => {
        setIsBotSettingUp(true);
        try {
            const url = window.location.origin;
            const res = await setupTelegramWebhook(url);
            if (res.success) {
                setBotBotReady(true);
                toast({ title: "Bot Connected!", description: "Technicians can now use /start to get their Chat ID." });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Connection Failed", description: e.message });
        } finally {
            setIsBotSettingUp(false);
        }
    }
    
    return (
        <AppLayout>
            <div className="flex flex-col gap-6 sm:gap-8 max-w-full overflow-x-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                <div className="space-y-1 px-1">
                    <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Workshop Settings</h1>
                    <p className="text-[10px] sm:text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">Configuration & Infrastructure</p>
                </div>

                {/* Telegram Bot Integration Card */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Send className="h-20 w-24 -rotate-12" />
                    </div>
                    <CardHeader className="p-5 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-0.5 px-2.5 text-[9px] font-black uppercase tracking-widest mb-1.5">
                                    Real-time Automation
                                </Badge>
                                <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-black">
                                    <Send className="h-5 w-5 sm:h-6 sm:w-6" />
                                    Telegram System
                                </CardTitle>
                                <CardDescription className="text-blue-100/80 text-[11px] sm:text-sm font-medium">
                                    Connect your official bot to enable automated salary slips.
                                </CardDescription>
                            </div>
                            <div className="w-full sm:w-auto">
                                {botReady ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white flex items-center gap-2 py-1.5 px-3 rounded-xl border-none shadow-lg text-[10px] font-bold">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Bot Connected
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={handleInitTelegram} disabled={isBotSettingUp} className="h-10 w-full sm:w-auto bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl font-bold text-xs">
                                            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isBotSettingUp && "animate-spin")} /> Reconnect
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={handleInitTelegram} disabled={isBotSettingUp} className="h-11 w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-blue-900/20 active:scale-95 transition-all text-xs">
                                        {isBotSettingUp ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Initializing...</> : "Connect Bot Now"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-8 pt-0">
                        <div className="bg-black/10 rounded-2xl p-4 flex items-start gap-3">
                            <Info className="h-4 w-4 text-blue-200 shrink-0 mt-0.5" />
                            <p className="text-[10px] sm:text-xs text-blue-50 leading-relaxed font-medium">
                                <b>How it works:</b> Tell your technicians to search for the bot on Telegram and type <code className="bg-white/20 px-1 py-0.5 rounded text-white">/start</code>. 
                                The bot will provide their unique ID which you must save in their profile.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Enterprise Settings Section */}
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-md">
                    <CardHeader className="p-5 sm:p-8 pb-4">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black">Enterprise Data</CardTitle>
                                <CardDescription className="text-[10px] sm:text-xs">Master configurations for official document generation.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-8 pt-0">
                       <Tabs defaultValue="Vithal" className="w-full">
                            <div className="px-5 sm:px-0">
                                <TabsList className="grid w-full grid-cols-2 h-11 p-1 rounded-2xl bg-muted/50 border">
                                    <TabsTrigger value="Vithal" className="rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest">Vithal Ent.</TabsTrigger>
                                    <TabsTrigger value="RV" className="rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest">RV Ent.</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="Vithal" className="pt-6 px-5 sm:px-0">
                                <SettingsForm enterprise="Vithal" />
                            </TabsContent>
                            <TabsContent value="RV" className="pt-6 px-5 sm:px-0">
                                <SettingsForm enterprise="RV" />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Bank Accounts Section */}
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-md">
                    <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <CreditCard className="h-3.5 w-3.5 sm:h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-black">Treasury & Banking</CardTitle>
                                    <CardDescription className="text-[9px] sm:text-xs">Manage settlement accounts.</CardDescription>
                                </div>
                            </div>
                            <Button onClick={() => openBankAccountDialog(null)} size="sm" className="h-9 sm:h-10 rounded-xl px-4 font-bold shadow-lg shadow-primary/10 w-full sm:w-auto text-[10px] sm:text-xs">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                                New Account
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-8 pt-0">
                        <Tabs value={activeBankTab} onValueChange={(value) => setActiveBankTab(value as Enterprise)} className="px-4 sm:px-0">
                            <TabsList className="grid w-full grid-cols-2 h-8 p-0.5 rounded-lg bg-muted/30 border-none mb-4 sm:mb-5">
                                <TabsTrigger value="Vithal" className="rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider h-7">Vithal Accounts</TabsTrigger>
                                <TabsTrigger value="RV" className="rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider h-7">RV Accounts</TabsTrigger>
                            </TabsList>
                            
                            {/* Mobile List View */}
                            <div className="md:hidden space-y-2 pb-4">
                                {isLoadingBankAccounts ? (
                                    <div className="py-6 text-center animate-pulse text-[9px] font-bold text-muted-foreground uppercase">Syncing accounts...</div>
                                ) : bankAccounts && bankAccounts.length > 0 ? (
                                    bankAccounts.map(account => (
                                        <div key={account.id} className="p-3 rounded-2xl border bg-card/50 shadow-sm space-y-2 relative group active:scale-[0.99] transition-transform">
                                            <div className="flex justify-between items-start pr-1">
                                                <div className="space-y-0.5">
                                                    <h4 className="font-black text-[11px] leading-tight text-foreground">{account.nickname}</h4>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tight">{account.bankName}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] py-0 h-4 font-mono border-primary/20 text-primary px-1.5 shrink-0">
                                                    {account.ifscCode}
                                                </Badge>
                                            </div>
                                            <div className="pt-2 border-t border-border/40 flex justify-between items-end">
                                                <div className="space-y-0.5">
                                                    <p className="text-[7px] font-black text-muted-foreground/60 uppercase tracking-tighter">A/C Number</p>
                                                    <p className="text-[11px] font-mono font-bold tracking-tight text-primary">{account.accountNumber}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500 rounded-lg hover:bg-amber-50" onClick={() => openBankAccountDialog(account)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive rounded-lg hover:bg-destructive/5" onClick={() => openDeleteDialog(account)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                                        <CreditCard className="h-6 w-6 text-muted-foreground/20 mx-auto mb-1.5" />
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">No accounts added</p>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-none">
                                            <TableHead className="rounded-l-xl pl-6">Nickname</TableHead>
                                            <TableHead>Bank & Branch</TableHead>
                                            <TableHead>Account details</TableHead>
                                            <TableHead className="text-right pr-6 rounded-r-xl">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingBankAccounts ? (
                                            <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                                        ) : bankAccounts && bankAccounts.length > 0 ? (
                                            bankAccounts.map(account => (
                                                <TableRow key={account.id} className="hover:bg-muted/20 border-b border-border/50">
                                                    <TableCell className="font-bold pl-6 text-sm">{account.nickname}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-xs">{account.bankName}</div>
                                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">{account.bankBranch || '-'}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-mono text-xs font-bold">{account.accountNumber}</div>
                                                        <div className="text-[9px] text-primary font-bold uppercase">IFSC: {account.ifscCode}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 rounded-full" onClick={() => openBankAccountDialog(account)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-full" onClick={() => openDeleteDialog(account)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground italic text-xs">No accounts added yet.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isBankAccountDialogOpen} onOpenChange={setIsBankAccountDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200">
                    <DialogHeader className="p-6 sm:p-8 bg-primary/5 border-b border-primary/10">
                        <DialogTitle className="text-xl sm:text-2xl font-black">{selectedBankAccount ? 'Modify Bank' : `New Settlement Account`}</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                            Enterprise: {activeBankTab} Enterprises
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-6 sm:p-8">
                        <BankAccountForm 
                            onSubmit={handleBankAccountFormSubmit}
                            onCancel={() => setIsBankAccountDialogOpen(false)}
                            initialData={selectedBankAccount || undefined}
                            mode={selectedBankAccount ? 'edit' : 'add'}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!bankAccountToDelete} onOpenChange={(open) => !open && setBankAccountToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-6">
                    <AlertDialogHeader>
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                            <Trash2 className="h-6 w-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-lg sm:text-xl font-black">Remove Bank Account?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
                            This will permanently delete <span className="font-bold text-foreground">"{bankAccountToDelete?.nickname}"</span>. You will not be able to select this account for new invoices.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="h-11 rounded-xl font-bold border-muted text-xs">Keep Account</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBankAccount} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 text-xs">Yes, Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </AppLayout>
    );
}
