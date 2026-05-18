
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
import { FileDown, Plus, Trash2, Printer, Search, Building2, Car, CalendarDays, Hash, Info, Loader2, XCircle, Type, Ruler, LayoutTemplate, Settings2, Save, History, Clock, ListFilter } from 'lucide-react';
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

const DEFAULT_ADDRESS = "S. No. 14/6A, Khot Banglow, Nr Transformer, Bhandarli, Pimpri, Thane - 400 612";

export default function ChallansPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

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
    
    // History & Forklift State
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
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
    const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

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

    // Proper Dashboard Filter logic - including particulars content
    const filteredHistory = useMemo(() => {
        if (!savedChallans) return [];
        if (!historySearch) return savedChallans;
        const lower = historySearch.toLowerCase();
        return savedChallans.filter(c => 
            c.challanNo.toLowerCase().includes(lower) || 
            c.deliveryToName.toLowerCase().includes(lower) ||
            (c.vehicleNo || '').toLowerCase().includes(lower) ||
            c.fromName.toLowerCase().includes(lower) ||
            c.items.some(item => item.particulars.toLowerCase().includes(lower))
        );
    }, [savedChallans, historySearch]);

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
        } catch (e) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not store record.' });
        } finally {
            setIsSaving(false);
        }
    };

    const loadHistoryRecord = (record: Challan) => {
        setEnterprise(record.enterprise);
        setChallanNo(record.challanNo);
        setVehicleNo(record.vehicleNo || '');
        setDate(record.date);
        
        // Match from/to logic
        setFromId('manual');
        setManualFromName(record.fromName);
        setFromAddress(record.fromAddress);
        
        setDeliveryToId('manual');
        setManualDeliveryToName(record.deliveryToName);
        setDeliveryToAddress(record.deliveryToAddress);
        
        setItems(record.items);

        // Restore layout
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

        setIsHistoryDialogOpen(false);
        toast({ title: 'Record Loaded', description: `Challan ${record.challanNo} details restored.` });
    };

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

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <FileDown className="h-7 w-7 text-primary" />
                            Challan Generator
                        </h1>
                        <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
                            Create Delivery & Service Challans
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline"
                            onClick={() => setIsHistoryDialogOpen(true)}
                            className="h-12 px-4 rounded-xl font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5 shadow-sm"
                            title="Challan Management Dashboard"
                        >
                            <History className="mr-2 h-5 w-5 text-primary" />
                            Dashboard
                        </Button>
                        <Button 
                            variant="secondary"
                            onClick={handleSaveRecord} 
                            disabled={isSaving || !challanNo}
                            className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest shadow-sm"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save Record</>}
                        </Button>
                        <Button 
                            onClick={handleGenerate} 
                            disabled={isGenerating}
                            className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Printer className="mr-2 h-5 w-5" /> Generate PDF</>}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Form */}
                    <Card className="lg:col-span-8 border-none shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <CardTitle>Challan Details</CardTitle>
                                    <CardDescription>Enter document information.</CardDescription>
                                </div>
                                <Select value={enterprise} onValueChange={(v: any) => setEnterprise(v)}>
                                    <SelectTrigger className="w-full sm:w-40 h-10 font-bold bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Vithal">Vithal Ent.</SelectItem>
                                        <SelectItem value="RV">R.V. Ent.</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Hash className="h-3 w-3" /> Challan No.
                                    </Label>
                                    <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="001/24-25" className="h-10 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Car className="h-3 w-3" /> Vehicle No.
                                    </Label>
                                    <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="MH-04-XX-1234" className="h-10 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <CalendarDays className="h-3 w-3" /> Date
                                    </Label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 font-bold" />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* FROM Section */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From Selection</Label>
                                    <Select value={fromId} onValueChange={setFromId}>
                                        <SelectTrigger className="h-10 text-xs font-bold">
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
                                        <Input placeholder="From Name" value={manualFromName} onChange={e => setManualFromName(e.target.value)} className="h-8 text-xs font-bold" />
                                    )}
                                    
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground/60 uppercase">From Address</Label>
                                        <Textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} className="min-h-[80px] text-xs leading-relaxed" />
                                    </div>
                                </div>

                                {/* DELIVERY TO Section */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery To Selection</Label>
                                    <Select value={deliveryToId} onValueChange={setDeliveryToId}>
                                        <SelectTrigger className="h-10 text-xs font-bold">
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
                                        <Input placeholder="Client Name" value={manualDeliveryToName} onChange={e => setManualDeliveryToName(e.target.value)} className="h-8 text-xs font-bold" />
                                    )}

                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground/60 uppercase">Delivery Address</Label>
                                        <Textarea value={deliveryToAddress} onChange={e => setDeliveryToAddress(e.target.value)} className="min-h-[80px] text-xs leading-relaxed" />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Particulars & Amount</Label>
                                    <Button variant="outline" size="sm" onClick={handleAddItem} className="h-8 rounded-lg text-[10px] font-black uppercase border-primary/20">
                                        <Plus className="mr-1 h-3 w-3" /> Add Item
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-start group">
                                            <div className="h-10 w-8 flex flex-col items-center justify-center gap-1 shrink-0">
                                                <div className="h-5 w-full flex items-center justify-center text-[10px] font-black text-muted-foreground/50 border rounded-t-lg bg-muted/20">{index + 1}</div>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => openForkliftPicker(index)}
                                                    className="h-5 w-full rounded-none rounded-b-lg border-primary/20 bg-primary/5 hover:bg-primary/10"
                                                    title="Load Forklift Details"
                                                >
                                                    <ForkliftIcon className="h-2.5 w-2.5 text-primary" />
                                                </Button>
                                            </div>
                                            <Textarea 
                                                value={item.particulars} 
                                                onChange={e => handleItemChange(index, 'particulars', e.target.value)} 
                                                placeholder="Details"
                                                className="flex-1 min-h-[40px] h-20 py-2 text-xs font-bold leading-snug resize-none"
                                            />
                                            <Input 
                                                type="number" 
                                                value={item.amount || ''} 
                                                onChange={e => handleItemChange(index, 'amount', e.target.value)} 
                                                placeholder="Amount"
                                                className="w-24 h-10 text-right font-mono font-black"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-10 w-10 text-destructive hover:bg-destructive/5">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Advanced Customization Sidebar */}
                    <Card className="lg:col-span-4 border-none shadow-lg bg-card rounded-3xl overflow-hidden self-start sticky top-24">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-primary" />
                                Layout Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Ruler className="h-3 w-3" /> Section Heights (mm)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Header</Label>
                                        <Input type="number" value={headerHeight} onChange={e => setHeaderHeight(parseInt(e.target.value) || 20)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Footer</Label>
                                        <Input type="number" value={footerHeight} onChange={e => setFooterHeight(parseInt(e.target.value) || 20)} className="h-8 text-xs font-bold" />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <LayoutTemplate className="h-3 w-3" /> Columns (mm)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">SR. Column</Label>
                                        <Input type="number" value={srWidth} onChange={e => setSrWidth(parseInt(e.target.value) || 15)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Amount Column</Label>
                                        <Input type="number" value={amountWidth} onChange={e => setAmountWidth(parseInt(e.target.value) || 30)} className="h-8 text-xs font-bold" />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Type className="h-3 w-3" /> Typography (PT)
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Sender Addr.</Label>
                                        <Input type="number" value={fromAddressFontSize} onChange={e => setFromAddressFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Client Addr.</Label>
                                        <Input type="number" value={deliveryToAddressFontSize} onChange={e => setDeliveryToAddressFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Body Font</Label>
                                        <Input type="number" value={particularsFontSize} onChange={e => setParticularsFontSize(parseInt(e.target.value) || 9)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Title Font</Label>
                                        <Input type="number" value={titleFontSize} onChange={e => setTitleFontSize(parseInt(e.target.value) || 10)} className="h-8 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <Label className="text-[9px] font-bold text-muted-foreground uppercase">Header Details</Label>
                                        <Input type="number" step="0.5" value={headerDetailsFontSize} onChange={e => setHeaderDetailsFontSize(parseFloat(e.target.value) || 8.5)} className="h-8 text-xs font-bold" />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-primary/10">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="stamp-toggle" className="text-[10px] font-black uppercase tracking-wider cursor-pointer">Include Stamp</Label>
                                        <p className="text-[8px] text-muted-foreground">Placed in footer</p>
                                    </div>
                                    <Switch 
                                        id="stamp-toggle" 
                                        checked={includeStamp} 
                                        onCheckedChange={setIncludeStamp} 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Management Dashboard / History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="flex items-center gap-2 text-primary font-black text-xl">
                                    <History className="h-6 w-6" />
                                    Challan Management Dashboard
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Search and track all machine deployments</DialogDescription>
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none py-1 px-3">
                                {savedChallans?.length || 0} Records Total
                            </Badge>
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                    placeholder="Search by Bill No, Client, Vehicle, or serial Number in Particulars..." 
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="pl-9 h-12 rounded-2xl border-muted bg-muted/20 focus-visible:ring-primary/20"
                                />
                                {historySearch && (
                                    <button 
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 rounded-2xl border border-dashed text-[10px] font-black uppercase text-muted-foreground">
                                <ListFilter className="h-3 w-3" />
                                Instant Dashboard Filters Active
                            </div>
                        </div>

                        <ScrollArea className="h-[500px]">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-3">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Database...</p>
                                </div>
                            ) : filteredHistory.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4 pb-4">
                                    {filteredHistory.map(challan => (
                                        <div key={challan.id} className="group relative bg-card border-2 border-muted/50 rounded-[28px] p-5 hover:border-primary/40 hover:shadow-xl transition-all duration-300">
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-lg tracking-tighter text-foreground">{challan.challanNo}</p>
                                                            <Badge className={cn(
                                                                "text-[8px] font-black px-1.5 uppercase h-4 border-none",
                                                                challan.enterprise === 'Vithal' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-600/10 text-blue-700"
                                                            )}>
                                                                {challan.enterprise} Ent.
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            {format(parseISO(challan.date), 'dd MMM yyyy')}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="outline" size="icon" onClick={() => loadHistoryRecord(challan)} className="h-9 w-9 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm" title="Reload into Editor">
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(challan.id)} className="h-9 w-9 text-destructive rounded-xl hover:bg-destructive/5" title="Permanent Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                            <Building2 className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-[11px] font-black text-foreground truncate uppercase">{challan.deliveryToName}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                            <Car className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{challan.vehicleNo || 'Self Pick-up'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-dashed">
                                                    <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest mb-2 flex items-center gap-1.5">
                                                        <Info className="h-2.5 w-2.5" /> Items Details
                                                    </p>
                                                    <div className="bg-muted/30 rounded-xl p-3 border border-muted/50">
                                                        <p className="text-[10px] font-medium leading-relaxed italic text-foreground line-clamp-2">
                                                            {challan.items.map(i => i.particulars.split('\n')[0]).join(' | ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 text-muted-foreground flex flex-col items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                                        <History className="h-10 w-10 opacity-20" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black uppercase tracking-widest">No matching records found</p>
                                        <p className="text-xs font-medium opacity-60">Try searching with a different term or clear the search</p>
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
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
                            {isLoadingForklifts ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Fleet...</p>
                                </div>
                            ) : filteredForklifts.length > 0 ? (
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
        </AppLayout>
    );
}
