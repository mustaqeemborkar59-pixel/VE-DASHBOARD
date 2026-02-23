'use client';

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/lib/data";
import { Separator } from "./ui/separator";

export type EmployeeFormData = {
  fullName: string;
  specialization: string;
  contactNumber: string;
  workLocation: string;
  availability: boolean;
  pfNumber: string;
  uanNumber: string;
  esicNumber: string;
  bankName: string;
  bankAccountNumber: string;
};

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => void;
  initialData?: Employee;
  mode: 'add' | 'edit';
}

export function EmployeeForm({ onSubmit, initialData, mode }: EmployeeFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    specialization: '',
    contactNumber: '',
    workLocation: '',
    availability: true,
    pfNumber: '',
    uanNumber: '',
    esicNumber: '',
    bankName: '',
    bankAccountNumber: '',
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        fullName: initialData.fullName || '',
        specialization: initialData.specialization || '',
        contactNumber: initialData.contactNumber || '',
        workLocation: initialData.workLocation || '',
        availability: initialData.availability ?? true,
        pfNumber: initialData.pfNumber || '',
        uanNumber: initialData.uanNumber || '',
        esicNumber: initialData.esicNumber || '',
        bankName: initialData.bankName || '',
        bankAccountNumber: initialData.bankAccountNumber || '',
      });
    } else {
        setFormData({
            fullName: '',
            specialization: '',
            contactNumber: '',
            workLocation: '',
            availability: true,
            pfNumber: '',
            uanNumber: '',
            esicNumber: '',
            bankName: '',
            bankAccountNumber: '',
        });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAvailabilityChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, availability: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out the full name.",
      });
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form id="employee-form" onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="e.g., John Doe" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
              <Label htmlFor="specialization">Role</Label>
              <Input id="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g., Technician, Worker" />
          </div>
          <div className="grid gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="e.g., +1 234 567 890" />
          </div>
        </div>
        
        <Separator />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statutory & Bank Details</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
              <Label htmlFor="pfNumber">PF No.</Label>
              <Input id="pfNumber" value={formData.pfNumber} onChange={handleInputChange} placeholder="PF Account No." />
          </div>
          <div className="grid gap-2">
              <Label htmlFor="uanNumber">UAN Number</Label>
              <Input id="uanNumber" value={formData.uanNumber} onChange={handleInputChange} placeholder="UAN Number" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
              <Label htmlFor="esicNumber">ESIC No.</Label>
              <Input id="esicNumber" value={formData.esicNumber} onChange={handleInputChange} placeholder="ESIC Number" />
          </div>
          <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g., HDFC Bank" />
          </div>
        </div>

        <div className="grid gap-2">
            <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
            <Input id="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleInputChange} placeholder="Account Number" />
        </div>

        <Separator />

        <div className="grid gap-2">
            <Label htmlFor="workLocation">Work Location</Label>
            <Input id="workLocation" value={formData.workLocation} onChange={handleInputChange} placeholder="e.g., Workshop, On-Site" />
        </div>
        <div className="flex items-center space-x-2">
            <Switch id="availability" checked={formData.availability} onCheckedChange={handleAvailabilityChange} />
            <Label htmlFor="availability">Available for assignments</Label>
        </div>
    </form>
  );
}
