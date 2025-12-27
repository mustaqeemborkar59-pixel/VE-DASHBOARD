'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Company } from '@/lib/data';

export type CompanyFormData = {
  name: string;
  address: string;
  gstin: string;
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
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        address: initialData.address,
        gstin: initialData.gstin || '',
      });
    } else {
      setFormData({ name: '', address: '', gstin: '' });
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
