
'use client';
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import companyDetails from '@/lib/company-details.json';

type CompanyDetails = typeof companyDetails;

export default function SettingsPage() {
    const { toast } = useToast();
    const [details, setDetails] = useState<CompanyDetails>(companyDetails);
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setDetails(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // This is a placeholder for a server action to update the JSON file.
        // In a real app, this would be an API call or server action.
        console.log("Saving details:", details);

        // For demonstration, we'll just show a success toast.
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({
            title: "Settings Saved",
            description: "Your company details have been updated.",
        });
        
        // In a real scenario, you would need an API endpoint to write back to the file system.
        // For this prototyping environment, we cannot write to the file system directly from the client.
        // The changes will persist in the component state for the session.
        alert("Saving to the JSON file is not supported in this environment. The changes are reflected in the UI but won't persist after a refresh.");


        setIsSaving(false);
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Company Settings</CardTitle>
                        <CardDescription>Manage your company's details for invoices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input id="companyName" value={details.companyName} onChange={handleInputChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="sacCode">SAC Code</Label>
                                    <Input id="sacCode" value={details.sacCode} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan">PAN Number</Label>
                                    <Input id="pan" value={details.pan} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input id="gstin" value={details.gstin} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input id="bankName" value={details.bankName} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankBranch">Branch</Label>
                                    <Input id="bankBranch" value={details.bankBranch} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input id="accountNumber" value={details.accountNumber} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifscCode">IFSC Code</Label>
                                    <Input id="ifscCode" value={details.ifscCode} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Contact Person</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">Full Name</Label>
                                    <Input id="contactPerson" value={details.contactPerson} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactNumber">Contact Number</Label>
                                    <Input id="contactNumber" value={details.contactNumber} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                             <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                             </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
