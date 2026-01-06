'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Company } from '@/lib/data';
import { Separator } from './ui/separator';

export type CompanyFormData = {
  name: string;
  address: string;
  gstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
};

interface CompanyFormProps {
  onSubmit: (data: CompanyFormData) => void;
  onCancel: () => void;
  initialData?: Company;
  mode: 'add' | 'edit';
}

export function CompanyForm({ onSubmit, onCancel, initialData, mode }: CompanyFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    address: '',
    gstin: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        address: initialData.address,
        gstin: initialData.gstin || '',
        bankName: initialData.bankName || '',
        accountNumber: initialData.accountNumber || '',
        ifscCode: initialData.ifscCode || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        gstin: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
      });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out company name and address.",
      });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Company Name</Label>
        <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Bisleri International Pvt. Ltd." required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" value={formData.address} onChange={handleInputChange} placeholder="Enter full address" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="gstin">GSTIN</Label>
        <Input id="gstin" value={formData.gstin} onChange={handleInputChange} placeholder="e.g., 27AACCA4355K1ZL" />
      </div>
      
      <Separator />
      
      <div className="space-y-4">
          <h3 className="text-lg font-medium">Bank Details (Optional)</h3>
          <div className="grid gap-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g., HDFC Bank" />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input id="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="e.g., 50200012345678" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input id="ifscCode" value={formData.ifscCode} onChange={handleInputChange} placeholder="e.g., HDFC0000001" />
              </div>
          </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {mode === 'add' ? 'Add Company' : 'Update Company'}
        </Button>
      </div>
    </form>
  );
}
