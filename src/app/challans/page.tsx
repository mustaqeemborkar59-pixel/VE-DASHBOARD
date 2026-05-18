'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Company, CompanySettings, Forklift, Challan } from '@/lib/data';
import { FileDown, Plus, Trash2, Printer, Search, Building2, Car, CalendarDays, Hash, Info, Loader2, XCircle, Type, Ruler, LayoutTemplate, Settings2, Save, History, Clock, ListFilter, ArrowLeft, PlusCircle, Eye, Filter, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateChallanPdf, type ChallanItem } from '@/lib/challan-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ForkliftIcon } from '@/components/icons/forklift-icon';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DEFAULT_ADDRESS = "S. No. 14/6A, Khot Banglow, Nr Transformer, Bhandarli, Pimpri, Thane - 400 612";

export default function ChallansPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // View State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedChallanForView, setSelectedChallanForView] = useState<Challan | null>(null);

    // Form State
    const [enterprise, setEnterprise] = useState<'Vithal' | 'RV'>('Vithal');
    const [challanNo, setChallanNo] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [includeStamp, setIncludeStamp] = useState(false);
    
    // Layout Customization State
    const [fromAddressFontSize, setFromAddressFontSize] = useState(10);
    const [deliveryToAddressFontSize, setDeliveryToAddressFontSize] = useState(10);
    const [headerHeight, setHeaderHeight] = useState(20);
    const [footerHeight, setFooterHeight] = useState(20);
    const [srWidth, setSrWidth] = useState(15);
    const [amountWidth, setAmountWidth] = useState(30);
    const [particularsFontSize, setParticularsFontSize] = useState(9);
    const [titleFontSize, setTitleFontSize] = useState(10);
    const [headerDetailsFontSize, setHeaderDetailsFontSize] = useState(8.5);
    
    // "From" Selection
    const [fromId, setFromId] = useState('enterprise');
    const [manualFromName, setManualFromName] = useState('');
    const [fromAddress, setFromAddress] = useState(DEFAULT_ADDRESS);

    // "Delivery To" Selection
    const [deliveryToId, setDeliveryToId] = useState('');
    const [manualDeliveryToName, setManualDeliveryToName] = useState('');
    const [deliveryToAddress, setDeliveryToAddress] = useState('');
    
    const [items, setItems] = useState<ChallanItem[]>([{ particulars: '', amount: 0 }]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Search & Picker State
    const [historySearch, setHistorySearch] = useState('');
    const [firmFilter, setFirmFilter] = useState<'All' | 'Vithal' | 'RV'>('All');
    const [isForkliftDialogOpen, setIsForkliftDialogOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [forkliftSearch, setForkliftSearch] = useState('');

    // Data fetching
    const companiesQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, 
        [firestore, user]
    );
    const { data: companies } = useCollection<Company>(companiesQuery);

    const forkliftsQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'forklifts'), orderBy('serialNumber', 'asc')) : null, 
        [firestore, user]
    );
    const { data: forklifts } = useCollection<Forklift>(forkliftsQuery);

    const challansQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'challans'), orderBy('createdAt', 'desc')) : null, 
        [firestore, user]
    );
    const { data: savedChallans, isLoading: isLoadingHistory } = useCollection<Challan>(challansQuery);

    const settingsRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'companySettings', enterprise.toLowerCase()) : null,
        [firestore, user, enterprise]
    );
    const { data: settings } = useDoc<CompanySettings>(settingsRef);

    const selectedFromCompany = useMemo(() => 
        companies?.find(c => c.id === fromId), 
        [companies, fromId]
    );

    const selectedDeliveryCompany = useMemo(() => 
        companies?.find(c => c.id === deliveryToId), 
        [companies, deliveryToId]
    );

    // Sync From Address
    useEffect(() => {
        if (fromId === 'enterprise') {
            setFromAddress(settings?.address || DEFAULT_ADDRESS);
        } else if (fromId !== 'manual' && selectedFromCompany) {
            setFromAddress(selectedFromCompany.address);
        }
    }, [fromId, selectedFromCompany, settings]);

    // Sync Delivery Address
    useEffect(() => {
        if (deliveryToId === 'enterprise') {
            setDeliveryToAddress(settings?.address || DEFAULT_ADDRESS);
        } else if (deliveryToId !== 'manual' && selectedDeliveryCompany) {
            setDeliveryToAddress(selectedDeliveryCompany.address);
        }
    }, [deliveryToId, selectedDeliveryCompany, settings]);

    const filteredForklifts = useMemo(() => {
        if (!forklifts) return [];
        if (!forkliftSearch) return forklifts;
        const lower = forkliftSearch.toLowerCase();
        return forklifts.filter(f => 
            String(f.serialNumber || '').toLowerCase().includes(lower) || 
            String(f.make || '').toLowerCase().includes(lower) || 
            String(f.model || '').toLowerCase().includes(lower)
        );
    }, [forklifts, forkliftSearch]);

    const filteredHistory = useMemo(() => {
        if (!savedChallans) return [];
        
        let list = savedChallans;

        // Apply Firm Filter
        if (firmFilter !== 'All') {
            list = list.filter(c => c.enterprise === firmFilter);
        }

        // Apply Search Filter
        if (historySearch) {
            const lower = historySearch.toLowerCase();
            list = list.filter(c => 
                c.challanNo.toLowerCase().includes(lower) || 
                c.deliveryToName.toLowerCase().includes(lower) ||
                (c.vehicleNo || '').toLowerCase().includes(lower) ||
                c.fromName.toLowerCase().includes(lower) ||
                c.items.some(item => item.particulars.toLowerCase().includes(lower))
            );
        }

        return list;
    }, [savedChallans, historySearch, firmFilter]);

    const handleAddItem = () => {
        setItems([...items, { particulars: '', amount: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof ChallanItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'amount') {
            newItems[index].amount = parseFloat(String(value)) || 0;
        } else {
            newItems[index].particulars = String(value);
        }
        setItems(newItems);
    };

    const openForkliftPicker = (index: number) => {
        setActiveItemIndex(index);
        setForkliftSearch('');
        setIsForkliftDialogOpen(true);
    };

    const handleSelectForklift = (forklift: Forklift) => {
        if (activeItemIndex === null) return;
        const machineType = forklift.equipmentType || 'FORKLIFT';
        const details = [
            machineType.toUpperCase(),
            `   • S.No: ${forklift.serialNumber}`,
            `   • Capacity: ${forklift.capacity || 'N/A'}`,
            `   • Make: ${forklift.make} | Model: ${forklift.model}`,
            `   • Volt: ${forklift.voltage || 'N/A'} | Mfg Year: ${forklift.year}`
        ].join('\n');

        handleItemChange(activeItemIndex, 'particulars', details);
        setIsForkliftDialogOpen(false);
        setActiveItemIndex(null);
    };

    const handleSaveRecord = async () => {
        if (!challanNo || !date) {
            toast({ variant: 'destructive', title: 'Error', description: 'Challan No. and Date are required to save.' });
            return;
        }

        const fromName = fromId === 'enterprise' 
            ? (enterprise === 'Vithal' ? 'Vithal Enterprises' : 'R.V. Enterprises')
            : fromId === 'manual' ? manualFromName : (selectedFromCompany?.name || '');

        const deliveryToName = deliveryToId === 'enterprise'
            ? (enterprise === 'Vithal' ? 'Vithal Enterprises' : 'R.V. Enterprises')
            : deliveryToId === 'manual' ? manualDeliveryToName : (selectedDeliveryCompany?.name || '');

        setIsSaving(true);
        try {
            const challanData: Omit<Challan, 'id'> = {
                enterprise,
                challanNo,
                vehicleNo,
                date,
                fromName,
                fromAddress,
                deliveryToName,
                deliveryToAddress,
                items,
                layoutSettings: {
                    fromAddressFontSize,
                    deliveryToAddressFontSize,
                    headerHeight,
                    footerHeight,
                    srWidth,
                    amountWidth,
                    particularsFontSize,
                    titleFontSize,
                    headerDetailsFontSize,
                    includeStamp
                },
                createdAt: new Date().toISOString()
            };
            
            await addDocumentNonBlocking(collection(firestore!, 'challans'), challanData);
            toast({ title: 'Record Saved', description: `Challan ${challanNo} added to Dashboard.` });
            setIsFormOpen(false); 
        } catch (e) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not store record.' });
        } finally {
            setIsSaving(false);
        }
    };

    const loadHistoryRecord = (record: Challan) => {
        setEnterprise(record.enterprise as 'Vithal' | 'RV');
        setChallanNo(record.challanNo);
        setVehicleNo(record.vehicleNo || '');
        setDate(record.date);
        
        setFromId('manual');
        setManualFromName(record.fromName);
        setFromAddress(record.fromAddress);
        
        setDeliveryToId('manual');
        setManualDeliveryToName(record.deliveryToName);
        setDeliveryToAddress(record.deliveryToAddress);
        
        setItems(record.items);

        if (record.layoutSettings) {
            setFromAddressFontSize(record.layoutSettings.fromAddressFontSize);
            setDeliveryToAddressFontSize(record.layoutSettings.deliveryToAddressFontSize);
            setHeaderHeight(record.layoutSettings.headerHeight);
            setFooterHeight(record.layoutSettings.footerHeight);
            setSrWidth(record.layoutSettings.srWidth);
            setAmountWidth(record.layoutSettings.amountWidth);
            setParticularsFontSize(record.layoutSettings.particularsFontSize);
            setTitleFontSize(record.layoutSettings.titleFontSize);
            setHeaderDetailsFontSize(record.layoutSettings.headerDetailsFontSize);
            setIncludeStamp(record.layoutSettings.includeStamp);
        }

        setIsFormOpen(true);
        toast({ title: 'Record Loaded', description: `Challan ${record.challanNo} details restored.` });
    };

    const handleOpenView = (record: Challan) => {
        setSelectedChallanForView(record);
        setIsViewOpen(true);
    }

    const handleDeleteRecord = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'challans', id));
            toast({ title: 'Record Deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    }

    const handleGenerate = async () => {
        if (!challanNo || !date) {
            toast({ variant: 'destructive', title: 'Error', description: 'Challan No. and Date are required.' });
            return;
        }

        const fromName = fromId === 'enterprise' 
            ? (enterprise === 'Vithal' ? 'Vithal Enterprises' : 'R.V. Enterprises')
            : fromId === 'manual' ? manualFromName : (selectedFromCompany?.name || '');

        const deliveryToName = deliveryToId === 'enterprise'
            ? (enterprise === 'Vithal' ? 'Vithal Enterprises' : 'R.V. Enterprises')
            : deliveryToId === 'manual' ? manualDeliveryToName : (selectedDeliveryCompany?.name || '');

        setIsGenerating(true);
        try {
            await generateChallanPdf({
                enterprise,
                challanNo,
                vehicleNo,
                date,
                fromName,
                fromAddress,
                deliveryToName,
                deliveryToAddress,
                items,
                pan: settings?.pan || 'N/A',
                gstin: settings?.gstin || 'N/A',
                includeStamp,
                fromAddressFontSize,
                deliveryToAddressFontSize,
                headerHeight,
                footerHeight,
                srWidth,
                amountWidth,
                titleFontSize,
                particularsFontSize,
                headerDetailsFontSize
            });
            toast({ title: 'Success', description: 'Challan PDF generated.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateNew = () => {
        // Reset form
        setChallanNo('');
        setVehicleNo('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setItems([{ particulars: '', amount: 0 }]);
        setFromId('enterprise');
        setDeliveryToId('');
        setManualDeliveryToName('');
        setManualFromName('');
        setIsFormOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <FileDown className="h-7 w-7 text-primary" />
                            {isFormOpen ? "Create Challan" : "Challan Dashboard"}
                        </h1>
                        <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
                            {isFormOpen ? "Generator Editor" : "Delivery & Service History"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isFormOpen ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="h-10 rounded-xl font-bold">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                                </Button>
                                <Button variant="secondary" onClick={handleSaveRecord} disabled={isSaving || !challanNo} className="h-10 rounded-xl font-bold uppercase tracking-widest">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save</>}
                                </Button>
                                <Button onClick={handleGenerate} disabled={isGenerating} className="h-10 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="mr-2 h-4 w-4" /> PDF</>}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleCreateNew} className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                <PlusCircle className="mr-2 h-5 w-5" /> Add New Challan
                            </Button>
                        )}
                    </div>
                </div>

                {!isFormOpen ? (
                    /* --- DASHBOARD VIEW --- */
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm bg-muted/20 rounded-3xl p-6">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Search by Bill No, Client, Vehicle, or Serial Number..." 
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        className="pl-10 h-12 rounded-2xl border-muted-foreground/10 bg-background focus-visible:ring-primary/20 text-sm font-medium"
                                    />
                                    {historySearch && (
                                        <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <XCircle className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                    <Select value={firmFilter} onValueChange={(v: any) => setFirmFilter(v)}>
                                        <SelectTrigger className="h-12 w-full md:w-40 rounded-2xl font-bold bg-background border-muted-foreground/10">
                                            <div className="flex items-center gap-2">
                                                <Filter className="h-4 w-4 text-muted-foreground" />
                                                <SelectValue placeholder="All Firms" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Firms</SelectItem>
                                            <SelectItem value="Vithal">Vithal Ent.</SelectItem>
                                            <SelectItem value="RV">R.V. Ent.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="hidden md:flex items-center gap-4 shrink-0 bg-background/50 px-4 py-2 rounded-2xl border border-dashed text-xs font-black uppercase text-muted-foreground h-12">
                                        <div className="text-primary">{filteredHistory.length} Results</div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingHistory ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <Card key={i} className="h-60 rounded-[32px] animate-pulse bg-muted/30 border-none" />
                                ))
                            ) : filteredHistory.length > 0 ? (
                                filteredHistory.map(challan => (
                                    <Card key={challan.id} className="group relative bg-card border border-muted-foreground/10 rounded-[32px] p-6 hover:border-primary/40 hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full">
                                        {/* Corner Label */}
                                        <div className={cn(
                                            "absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest",
                                            challan.enterprise === 'Vithal' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-600/10 text-blue-700"
                                        )}>
                                            {challan.enterprise} Ent.
                                        </div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <p className="font-black text-2xl tracking-tighter text-foreground leading-none">{challan.challanNo}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                    <Clock className="h-3 w-3" />
                                                    {format(parseISO(challan.date), 'dd MMM yyyy')}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Button variant="outline" size="icon" onClick={() => handleOpenView(challan)} className="h-9 w-9 rounded-xl border-muted-foreground/10 hover:bg-muted transition-all">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => loadHistoryRecord(challan)} className="h-9 w-9 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all">
                                                    <History className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(challan.id)} className="h-9 w-9 text-destructive rounded-xl hover:bg-destructive/5">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-xs font-black text-foreground truncate uppercase">{challan.deliveryToName}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                                    <Car className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{challan.vehicleNo || 'Self Pick-up'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-dashed border-muted-foreground/20">
                                            <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest mb-2 flex items-center gap-1.5">
                                                <Info className="h-3 w-3" /> Items Details
                                            </p>
                                            <div className="bg-muted/30 rounded-2xl p-3 border border-muted-foreground/5">
                                                <p className="text-[10px] font-medium leading-relaxed italic text-foreground/80 line-clamp-2">
                                                    {challan.items.map(i => i.particulars.split('\n')[0]).join(' | ')}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-32 text-center flex flex-col items-center gap-4">
                                    <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center opacity-30">
                                        <History className="h-12 w-12" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black uppercase tracking-widest text-muted-foreground">No matching records</p>
                                        <p className="text-sm font-medium text-muted-foreground/60">Try searching for a different machine or client</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* --- EDITOR VIEW --- */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4 duration-500">
                        {/* Editor Form */}
                        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[32px] overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle>Challan Editor</CardTitle>
                                        <CardDescription>Enter details and item specifications.</CardDescription>
                                    </div>
                                    <Select value={enterprise} onValueChange={(v: any) => setEnterprise(v)}>
                                        <SelectTrigger className="w-full sm:w-40 h-10 font-bold bg-background rounded-xl border-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vithal">Vithal Ent.</SelectItem>
                                            <SelectItem value="RV">R.V. Ent.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Hash className="h-3 w-3" /> Challan No.</Label>
                                        <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="001/24-25" className="h-11 font-bold rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Car className="h-3 w-3" /> Vehicle No.</Label>
                                        <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="MH-04-XX-1234" className="h-11 font-bold rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date</Label>
                                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 font-bold rounded-xl" />
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {/* FROM Section */}
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">From Selection</Label>
                                        <Select value={fromId} onValueChange={setFromId}>
                                            <SelectTrigger className="h-11 text-xs font-bold rounded-xl">
                                                <SelectValue placeholder="Select Source" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="enterprise">Default Enterprise</SelectItem>
                                                <SelectItem value="manual">-- Manual Entry --</SelectItem>
                                                <Separator className="my-1" />
                                                {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {fromId === 'manual' && (
                                            <Input placeholder="From Name" value={manualFromName} onChange={e => setManualFromName(e.target.value)} className="h-10 text-xs font-bold rounded-xl" />
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold text-muted-foreground/60 uppercase">Sender Address</Label>
                                            <Textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} className="min-h-[100px] text-xs leading-relaxed rounded-xl" />
                                        </div>
                                    </div>

                                    {/* DELIVERY TO Section */}
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Delivery To Selection</Label>
                                        <Select value={deliveryToId} onValueChange={setDeliveryToId}>
                                            <SelectTrigger className="h-11 text-xs font-bold rounded-xl">
                                                <SelectValue placeholder="Select Destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="enterprise">Default Enterprise</SelectItem>
                                                <SelectItem value="manual">-- Manual Entry --</SelectItem>
                                                <Separator className="my-1" />
                                                {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {deliveryToId === 'manual' && (
                                            <Input placeholder="Client Name" value={manualDeliveryToName} onChange={e => setManualDeliveryToName(e.target.value)} className="h-10 text-xs font-bold rounded-xl" />
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-bold text-muted-foreground/60 uppercase">Delivery Address</Label>
                                            <Textarea value={deliveryToAddress} onChange={e => setDeliveryToAddress(e.target.value)} className="min-h-[100px] text-xs leading-relaxed rounded-xl" />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Particulars & Amount</Label>
                                        <Button variant="outline" size="sm" onClick={handleAddItem} className="h-9 rounded-xl text-[10px] font-black uppercase border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                                            <Plus className="mr-1.5 h-4 w-4" /> Add Line Item
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {items.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-start group animate-in slide-in-from-left-2 duration-300">
                                                <div className="flex flex-col gap-1 shrink-0 w-10">
                                                    <div className="h-6 w-full flex items-center justify-center text-[10px] font-black text-muted-foreground/50 border rounded-t-xl bg-muted/20">{index + 1}</div>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        onClick={() => openForkliftPicker(index)}
                                                        className="h-10 w-full rounded-none rounded-b-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                                                        title="Load Fleet Specs"
                                                    >
                                                        <ForkliftIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <Textarea 
                                                    value={item.particulars} 
                                                    onChange={e => handleItemChange(index, 'particulars', e.target.value)} 
                                                    placeholder="Detailed technical description..."
                                                    className="flex-1 min-h-[44px] h-24 py-3 text-xs font-bold leading-snug rounded-xl resize-none"
                                                />
                                                <div className="space-y-1">
                                                    <Input 
                                                        type="number" 
                                                        value={item.amount || ''} 
                                                        onChange={e => handleItemChange(index, 'amount', e.target.value)} 
                                                        placeholder="Amt"
                                                        className="w-28 h-11 text-right font-mono font-black rounded-xl"
                                                    />
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="w-full h-8 text-destructive hover:bg-destructive/5 rounded-lg text-[9px] font-black uppercase">
                                                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customization Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="border-none shadow-xl bg-card rounded-[32px] overflow-hidden sticky top-24">
                                <CardHeader className="bg-muted/30 border-b pb-4 p-6">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-primary" />
                                        Layout Settings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <Ruler className="h-3 w-3" /> Section Heights (mm)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold text-muted-foreground uppercase">Firm Header</Label>
                                                <Input type="number" value={headerHeight} onChange={e => setHeaderHeight(parseInt(e.target.value) || 20)} className="h-9 text-xs font-bold rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold text-muted-foreground uppercase">Sign Footer</Label>
                                                <Input type="number" value={footerHeight} onChange={e => setFooterHeight(parseInt(e.target.value) || 20)} className="h-9 text-xs font-bold rounded-xl" />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/30" />

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <LayoutTemplate className="h-3 w-3" /> Column Widths (mm)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold text-muted-foreground uppercase">SR. Col</Label>
                                                <Input type="number" value={srWidth} onChange={e => setSrWidth(parseInt(e.target.value) || 15)} className="h-9 text-xs font-bold rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold text-muted-foreground uppercase">Amount Col</Label>
                                                <Input type="number" value={amountWidth} onChange={e => setAmountWidth(parseInt(e.target.value) || 30)} className="h-9 text-xs font-bold rounded-xl" />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/30" />

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <Type className="h-3 w-3" /> Typography (PT)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black text-muted-foreground uppercase">Sender Addr</Label>
                                                <Input type="number" value={fromAddressFontSize} onChange={e => setFromAddressFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold rounded-lg" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black text-muted-foreground uppercase">Client Addr</Label>
                                                <Input type="number" value={deliveryToAddressFontSize} onChange={e => setDeliveryToAddressFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold rounded-lg" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black text-muted-foreground uppercase">Listing Font</Label>
                                                <Input type="number" value={particularsFontSize} onChange={e => setParticularsFontSize(parseInt(e.target.value) || 9)} className="h-8 text-xs font-bold rounded-lg" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black text-muted-foreground uppercase">Title Font</Label>
                                                <Input type="number" value={titleFontSize} onChange={e => setTitleFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold rounded-lg" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 transition-colors hover:bg-primary/10">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="stamp-side" className="text-[10px] font-black uppercase tracking-wider cursor-pointer">Include Firm Stamp</Label>
                                            <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Bottom Right Placement</p>
                                        </div>
                                        <Switch id="stamp-side" checked={includeStamp} onCheckedChange={setIncludeStamp} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* View Details Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                    {selectedChallanForView && (
                        <>
                            <DialogHeader className="p-6 bg-muted/30 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge className={cn(
                                            "mb-2 text-[9px] font-black uppercase tracking-widest",
                                            selectedChallanForView.enterprise === 'Vithal' ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
                                        )}>
                                            {selectedChallanForView.enterprise} Enterprises
                                        </Badge>
                                        <DialogTitle className="text-2xl font-black">{selectedChallanForView.challanNo}</DialogTitle>
                                        <DialogDescription className="text-xs uppercase font-bold flex items-center gap-1.5 mt-1">
                                            <CalendarDays className="h-3 w-3" /> {format(parseISO(selectedChallanForView.date), 'dd MMMM yyyy')}
                                        </DialogDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => loadHistoryRecord(selectedChallanForView)} className="rounded-xl font-bold">
                                        <Pencil className="h-4 w-4 mr-2" /> Edit Record
                                    </Button>
                                </div>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">From</Label>
                                            <p className="text-sm font-black uppercase">{selectedChallanForView.fromName}</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedChallanForView.fromAddress}</p>
                                        </div>
                                        <div className="space-y-2 text-right">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Delivery To</Label>
                                            <p className="text-sm font-black uppercase">{selectedChallanForView.deliveryToName}</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedChallanForView.deliveryToAddress}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Particulars Listing</Label>
                                        <div className="border rounded-2xl overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead className="w-12 text-center text-[10px] font-black uppercase">SR.</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase">Item Details</TableHead>
                                                        <TableHead className="w-32 text-right text-[10px] font-black uppercase">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedChallanForView.items.map((item, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="text-center font-bold text-xs">{i + 1}</TableCell>
                                                            <TableCell className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{item.particulars}</TableCell>
                                                            <TableCell className="text-right font-mono font-bold text-xs text-primary">
                                                                {item.amount ? `₹${item.amount.toLocaleString('en-IN')}` : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {selectedChallanForView.vehicleNo && (
                                        <div className="p-4 bg-muted/20 rounded-2xl border border-dashed flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border shadow-sm">
                                                    <Car className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Transport Vehicle</p>
                                                    <p className="text-sm font-black uppercase tracking-widest">{selectedChallanForView.vehicleNo}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row gap-3">
                                <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest">Close</Button>
                                <Button onClick={() => { 
                                    setIsViewOpen(false); 
                                    generateChallanPdf({
                                        ...selectedChallanForView,
                                        enterprise: selectedChallanForView.enterprise as 'Vithal' | 'RV',
                                        pan: settings?.pan || 'N/A',
                                        gstin: settings?.gstin || 'N/A',
                                        ...selectedChallanForView.layoutSettings
                                    });
                                }} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                    <Printer className="mr-2 h-5 w-5" /> Generate PDF
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Forklift Picker Dialog */}
            <Dialog open={isForkliftDialogOpen} onOpenChange={setIsForkliftDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-md p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                        <DialogTitle className="flex items-center gap-2 text-primary font-black">
                            <ForkliftIcon className="h-5 w-5" />
                            Select Technical Unit
                        </DialogTitle>
                        <DialogDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Pull official specs from fleet database</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Search by Serial No, Make, or Model..." 
                                value={forkliftSearch}
                                onChange={(e) => setForkliftSearch(e.target.value)}
                                className="pl-9 h-11 border-muted bg-muted/10 rounded-2xl"
                            />
                        </div>
                        <ScrollArea className="h-[350px]">
                            {filteredForklifts.length > 0 ? (
                                <div className="grid gap-3 pr-4">
                                    {filteredForklifts.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => handleSelectForklift(f)}
                                            className="w-full text-left p-4 rounded-2xl border-2 border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{f.serialNumber}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{f.make} {f.model}</p>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Badge variant="outline" className="text-[8px] font-black px-1.5 uppercase h-4 bg-muted/20">{f.equipmentType || 'MHE'}</Badge>
                                                        <span className="text-[8px] font-black text-muted-foreground/60 uppercase">Year: {f.year}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary border-none">{f.capacity || 'N/A'}</Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-muted-foreground italic text-sm">No units found matching search.</div>
                            )}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-4 bg-muted/20 border-t">
                        <Button variant="ghost" onClick={() => setIsForkliftDialogOpen(false)} className="w-full h-11 font-black uppercase tracking-widest rounded-xl">Cancel Selection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Print-Only Style Container (Hidden in browser) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; overflow: visible !important; }
                }
            `}} />
        </AppLayout>
    );
}
