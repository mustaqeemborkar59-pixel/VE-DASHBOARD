
'use client';
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import companyDetails from '@/lib/company-details.json';

type CompanyDetails = typeof companyDetails;

export default function SettingsPage() {
    const details: CompanyDetails = companyDetails;

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Company Settings</CardTitle>
                        <CardDescription>
                            Aapki company ki details jo invoices mein istemal hoti hain. Inhe badalne ke liye, कृपया chat mein batayein.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input id="companyName" value={details.companyName} readOnly />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="sacCode">SAC Code</Label>
                                    <Input id="sacCode" value={details.sacCode} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan">PAN Number</Label>
                                    <Input id="pan" value={details.pan} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input id="gstin" value={details.gstin} readOnly />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input id="bankName" value={details.bankName} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankBranch">Branch</Label>
                                    <Input id="bankBranch" value={details.bankBranch} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input id="accountNumber" value={details.accountNumber} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifscCode">IFSC Code</Label>
                                    <Input id="ifscCode" value={details.ifscCode} readOnly />
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Contact Person</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">Full Name</Label>
                                    <Input id="contactPerson" value={details.contactPerson} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactNumber">Contact Number</Label>
                                    <Input id="contactNumber" value={details.contactNumber} readOnly />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
