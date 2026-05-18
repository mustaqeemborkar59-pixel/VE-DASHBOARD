'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Company, CompanySettings, Forklift } from '@/lib/data';
import { FileDown, Plus, Trash2, Printer, Search, Building2, Car, CalendarDays, Hash, Info, Loader2, XCircle } from 'lucide-react';
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

export default function ChallansPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const [enterprise, setEnterprise] = useState<'Vithal' | 'RV'>('Vithal');
    const [challanNo, setChallanNo] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [includeStamp, setIncludeStamp] = useState(false); // Default to false
    
    const [fromAddress, setFromAddress] = useState("S. No. 14/6A, Khot Banglow, Nr Transformer, Bhandarli, Pimpri, Thane - 400 612");
    const [deliveryToId, setDeliveryToId] = useState('');
    const [manualDeliveryTo, setManualDeliveryTo] = useState({ name: '', address: '' });
    
    const [items, setItems] = useState<ChallanItem[]>([{ particulars: '', amount: 0 }]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Forklift Selector State
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

    const settingsRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'companySettings', enterprise.toLowerCase()) : null,
        [firestore, user, enterprise]
    );
    const { data: settings } = useDoc<CompanySettings>(settingsRef);

    const selectedCompany = useMemo(() => 
        companies?.find(c => c.id === deliveryToId), 
        [companies, deliveryToId]
    );

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

        // Structured formatting with bullet points and sub-item appearance
        const details = [
            `BATTERY OPERATED ELECTRIC FORKLIFT`,
            `   • S.No: ${forklift.serialNumber}`,
            `   • Capacity: ${forklift.capacity || 'N/A'}`,
            `   • Make: ${forklift.make} | Model: ${forklift.model}`,
            `   • Volt: ${forklift.voltage || 'N/A'} | Mfg Year: ${forklift.year}`
        ].join('\n');

        handleItemChange(activeItemIndex, 'particulars', details);
        setIsForkliftDialogOpen(false);
        setActiveItemIndex(null);
    };

    const handleGenerate = async () => {
        if (!challanNo || !date) {
            toast({ variant: 'destructive', title: 'Error', description: 'Challan No. and Date are required.' });
            return;
        }

        setIsGenerating(true);
        try {
            await generateChallanPdf({
                enterprise,
                challanNo,
                vehicleNo,
                date,
                fromAddress,
                deliveryToName: selectedCompany?.name || manualDeliveryTo.name,
                deliveryToAddress: selectedCompany?.address || manualDeliveryTo.address,
                items,
                pan: settings?.pan || 'N/A',
                gstin: settings?.gstin || 'N/A',
                includeStamp
            });
            toast({ title: 'Success', description: 'Challan PDF generated successfully.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-500">
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
                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? "Generating..." : <><Printer className="mr-2 h-5 w-5" /> Generate PDF</>}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Form */}
                    <Card className="lg:col-span-8 border-none shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <CardTitle>Challan Details</CardTitle>
                                    <CardDescription>Enter the data for the document.</CardDescription>
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
                                    <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="e.g. 001/24-25" className="h-10 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Car className="h-3 w-3" /> Vehicle No.
                                    </Label>
                                    <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. MH-04-XX-1234" className="h-10 font-bold" />
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
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From Address</Label>
                                    <Textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} className="min-h-[80px] text-xs leading-relaxed" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery To</Label>
                                    <Select value={deliveryToId} onValueChange={setDeliveryToId}>
                                        <SelectTrigger className="h-10 text-xs font-bold">
                                            <SelectValue placeholder="Select Client Company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">-- Manual Entry --</SelectItem>
                                            {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {deliveryToId === 'manual' ? (
                                        <div className="space-y-2 mt-2">
                                            <Input placeholder="Client Name" value={manualDeliveryTo.name} onChange={e => setManualDeliveryTo({...manualDeliveryTo, name: e.target.value})} className="h-8 text-xs" />
                                            <Textarea placeholder="Client Address" value={manualDeliveryTo.address} onChange={e => setManualDeliveryTo({...manualDeliveryTo, address: e.target.value})} className="min-h-[60px] text-xs p-2" />
                                        </div>
                                    ) : selectedCompany ? (
                                        <div className="p-3 rounded-xl bg-muted/30 border border-dashed text-[10px] leading-relaxed">
                                            <p className="font-black text-foreground">{selectedCompany.name}</p>
                                            <p className="text-muted-foreground">{selectedCompany.address}</p>
                                        </div>
                                    ) : null}
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
                                                placeholder="Service details or item description"
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

                    {/* Quick Preview Side */}
                    <Card className="lg:col-span-4 border-none shadow-lg bg-primary/5 rounded-3xl overflow-hidden self-start sticky top-24">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm uppercase tracking-widest">Live Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Firm:</span>
                                    <span className="font-black text-primary uppercase">{enterprise} Enterprises</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-bold">{date ? format(parseISO(date), 'PP') : '-'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">To:</span>
                                    <span className="font-bold text-right truncate max-w-[150px]">{selectedCompany?.name || manualDeliveryTo.name || '-'}</span>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-black">
                                    <span>Total Amount</span>
                                    <span>₹{items.reduce((sum, i) => sum + i.amount, 0).toLocaleString('en-IN')}</span>
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-primary/10">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="stamp-toggle" className="text-[10px] font-black uppercase tracking-wider cursor-pointer">Include Official Stamp</Label>
                                        <p className="text-[8px] text-muted-foreground leading-none">Auto-placed above signature</p>
                                    </div>
                                    <Switch 
                                        id="stamp-toggle" 
                                        checked={includeStamp} 
                                        onCheckedChange={setIncludeStamp} 
                                    />
                                </div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                                    PDF will include official header, addresses, and signature blocks. {includeStamp ? "The enterprise stamp is currently enabled." : "The stamp has been disabled for this document."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Forklift Selection Dialog */}
            <Dialog open={isForkliftDialogOpen} onOpenChange={setIsForkliftDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-md p-0 rounded-3xl overflow-hidden">
                    <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                        <DialogTitle className="flex items-center gap-2">
                            <ForkliftIcon className="h-5 w-5 text-primary" />
                            Select Forklift
                        </DialogTitle>
                        <DialogDescription>Choose a forklift to insert its technical specs.</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search serial, make, model..." 
                                value={forkliftSearch}
                                onChange={(e) => setForkliftSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ScrollArea className="h-[300px]">
                            {isLoadingForklifts ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : filteredForklifts.length > 0 ? (
                                <div className="grid gap-2 pr-4">
                                    {filteredForklifts.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => handleSelectForklift(f)}
                                            className="w-full text-left p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-black text-sm">{f.serialNumber}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{f.make} {f.model}</p>
                                                </div>
                                                <Badge variant="secondary" className="text-[8px] uppercase">{f.capacity || 'N/A'}</Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground italic text-sm">No forklifts found.</div>
                            )}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-4 bg-muted/20 border-t">
                        <Button variant="ghost" onClick={() => setIsForkliftDialogOpen(false)} className="w-full">Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
