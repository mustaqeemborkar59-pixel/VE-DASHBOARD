'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Forklift } from "@/lib/data";

export type ForkliftFormData = {
  serialNumber: string;
  make: string;
  model: string;
  year: string;
  capacity: string;
  equipmentType: string;
};

interface ForkliftFormProps {
  onSubmit: (data: ForkliftFormData) => void;
  onCancel: () => void;
  initialData?: Forklift;
  mode: 'add' | 'edit';
}

export function ForkliftForm({ onSubmit, onCancel, initialData, mode }: ForkliftFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ForkliftFormData>({
    serialNumber: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    equipmentType: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        serialNumber: initialData.serialNumber,
        make: initialData.make,
        model: initialData.model,
        year: initialData.year.toString(),
        capacity: initialData.capacity || '',
        equipmentType: initialData.equipmentType || '',
      });
    } else {
        setFormData({
            serialNumber: '',
            make: '',
            model: '',
            year: '',
            capacity: '',
            equipmentType: '',
        });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialNumber || !formData.make || !formData.model || !formData.year) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required fields.",
      });
      return;
    }
    
    setIsSubmitting(true);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
        <div className="grid gap-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="e.g., F12345" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={formData.make} onChange={handleInputChange} placeholder="e.g., Toyota" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., 8FGCU25" required />
            </div>
        </div>
        <div className="grid gap-2">
            <Label htmlFor="equipmentType">Equipment Type</Label>
            <Input id="equipmentType" value={formData.equipmentType} onChange={handleInputChange} placeholder="e.g., Reach Truck" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" value={formData.year} onChange={handleInputChange} placeholder="e.g., 2021" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" value={formData.capacity} onChange={handleInputChange} placeholder="e.g., 5000 lbs" />
            </div>
        </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === 'add' ? 'Adding...' : 'Updating...') : (mode === 'add' ? 'Add Forklift' : 'Update Forklift')}
        </Button>
      </div>
    </form>
  );
}
