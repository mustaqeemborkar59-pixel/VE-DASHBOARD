'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { BankAccount } from '@/lib/data';

export type BankAccountFormData = {
  nickname: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
};

interface BankAccountFormProps {
  onSubmit: (data: BankAccountFormData) => void;
  onCancel: () => void;
  initialData?: BankAccount;
  mode: 'add' | 'edit';
}

export function BankAccountForm({ onSubmit, onCancel, initialData, mode }: BankAccountFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<BankAccountFormData>({
    nickname: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    bankBranch: '',
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        nickname: initialData.nickname || '',
        bankName: initialData.bankName || '',
        accountNumber: initialData.accountNumber || '',
        ifscCode: initialData.ifscCode || '',
        bankBranch: initialData.bankBranch || '',
      });
    } else {
      setFormData({
        nickname: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        bankBranch: '',
      });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nickname || !formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required bank details.",
      });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="nickname">Nickname</Label>
        <Input id="nickname" value={formData.nickname} onChange={handleInputChange} placeholder="e.g., HDFC Main, ICICI Salary" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankName">Bank Name</Label>
        <Input id="bankName" value={formData.bankName} onChange={handleInputChange} required />
      </div>
       <div className="grid gap-2">
        <Label htmlFor="accountNumber">Account Number</Label>
        <Input id="accountNumber" value={formData.accountNumber} onChange={handleInputChange} required />
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input id="ifscCode" value={formData.ifscCode} onChange={handleInputChange} required />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="bankBranch">Branch</Label>
            <Input id="bankBranch" value={formData.bankBranch} onChange={handleInputChange} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {mode === 'add' ? 'Add Account' : 'Update Account'}
        </Button>
      </div>
    </form>
  );
}
