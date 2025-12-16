'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Technician } from "@/lib/data";

export type TechnicianFormData = {
  firstName: string;
  lastName: string;
  specialization: string;
  availability: boolean;
};

interface TechnicianFormProps {
  onSubmit: (data: TechnicianFormData) => void;
  onCancel: () => void;
  initialData?: Technician;
  mode: 'add' | 'edit';
}

export function TechnicianForm({ onSubmit, onCancel, initialData, mode }: TechnicianFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<TechnicianFormData>({
    firstName: '',
    lastName: '',
    specialization: '',
    availability: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        specialization: initialData.specialization || '',
        availability: initialData.availability,
      });
    } else {
        setFormData({
            firstName: '',
            lastName: '',
            specialization: '',
            availability: true,
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
    if (!formData.firstName || !formData.lastName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out first and last name.",
      });
      return;
    }
    
    setIsSubmitting(true);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="e.g., John" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="e.g., Doe" required />
            </div>
        </div>
        <div className="grid gap-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input id="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g., Electrical" />
        </div>
        <div className="flex items-center space-x-2">
            <Switch id="availability" checked={formData.availability} onCheckedChange={handleAvailabilityChange} />
            <Label htmlFor="availability">Available for assignments</Label>
        </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === 'add' ? 'Adding...' : 'Updating...') : (mode === 'add' ? 'Add Technician' : 'Update Technician')}
        </Button>
      </div>
    </form>
  );
}
