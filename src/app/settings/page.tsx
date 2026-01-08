
'use client';
import { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanySettings, PageMargin } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function SettingsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, "companySettings", "primary") : null, [firestore]);
    
    const { data: initialSettings, isLoading } = useDoc<CompanySettings>(settingsDocRef);

    const [settings, setSettings] = useState<Partial<CompanySettings>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        }
    }, [initialSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        if (type === 'number') {
            const numValue = value === '' ? null : parseFloat(value);
            if (numValue === null || !isNaN(numValue)) {
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
       if (numValue === null || !isNaN(numValue)) {
        setSettings(prev => ({
            ...prev,
            pageMargins: { ...(prev.pageMargins || {top: 0, right: 0, bottom: 0, left: 0}), [field]: numValue }
        }));
      }
    }
    
    const handleFontSizeChange = (field: 'pageFontSize' | 'addressFontSize' | 'tableBodyFontSize', value: string) => {
        const numValue = value === '' ? null : parseInt(value, 10);
        if (numValue === null || !isNaN(numValue)) {
            setSettings(p => ({...p, [field]: numValue}));
        }
    }

    const handleSaveChanges = async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Error", description: "Could not connect to database." });
            return;
        }
        if (!settingsDocRef) return;

        setIsSubmitting(true);
        try {
            await setDoc(settingsDocRef, settings, { merge: true });
            toast({ title: "Success", description: "Settings updated successfully." });
        } catch (error) {
            console.error("Error updating settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update settings. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
            <AppLayout>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                       <div className="space-y-4">
                            <Skeleton className="h-6 w-1/4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                                <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Settings</CardTitle>
                        <CardDescription>
                            Manage company-wide settings for invoices, documents, and general information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input id="companyName" value={settings.companyName || ''} onChange={handleInputChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="sacCode">SAC Code</Label>
                                    <Input id="sacCode" value={settings.sacCode || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan">PAN Number</Label>
                                    <Input id="pan" value={settings.pan || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input id="gstin" value={settings.gstin || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input id="bankName" value={settings.bankName || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankBranch">Branch</Label>
                                    <Input id="bankBranch" value={settings.bankBranch || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input id="accountNumber" value={settings.accountNumber || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifscCode">IFSC Code</Label>
                                    <Input id="ifscCode" value={settings.ifscCode || ''} onChange={handleInputChange} />
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
                                    <Input id="nextBillNo" type="number" value={settings.nextBillNo || ''} onChange={handleInputChange} />
                                </div>
                             </div>
                             <div className="space-y-4 pt-2">
                                <Label>Default Document Layout</Label>
                                <div className="p-4 border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                </div>
                             </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save All Settings'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

    