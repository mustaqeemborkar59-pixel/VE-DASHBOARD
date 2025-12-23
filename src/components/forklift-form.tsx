
'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Forklift } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type ForkliftFormData = {
  serialNumber: string;
  make: string;
  model: string;
  year: string;
  capacity: string;
  equipmentType: string;
  locationType: 'Workshop' | 'On-Site';
  siteCompany: string;
  siteArea: string;
  siteContactPerson: string;
  siteContactNumber: string;
};

interface ForkliftFormProps {
  onSubmit: (data: Partial<ForkliftFormData>) => void;
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
    locationType: 'Workshop',
    siteCompany: '',
    siteArea: '',
    siteContactPerson: '',
    siteContactNumber: '',
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
        locationType: initialData.locationType || 'Workshop',
        siteCompany: initialData.siteCompany || '',
        siteArea: initialData.siteArea || '',
        siteContactPerson: initialData.siteContactPerson || '',
        siteContactNumber: initialData.siteContactNumber || '',
      });
    } else {
        setFormData({
            serialNumber: '',
            make: '',
            model: '',
            year: '',
            capacity: '',
            equipmentType: '',
            locationType: 'Workshop',
            siteCompany: '',
            siteArea: '',
            siteContactPerson: '',
            siteContactNumber: '',
        });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleLocationChange = (value: 'Workshop' | 'On-Site') => {
    setFormData(prev => ({ ...prev, locationType: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialNumber || !formData.make || !formData.model || !formData.year) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required forklift details.",
      });
      return;
    }
    
    if (formData.locationType === 'On-Site' && !formData.siteCompany) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a site/company name for on-site forklifts.",
      });
      return;
    }

    setIsSubmitting(true);
    
    const dataToSubmit: Partial<ForkliftFormData> = {
      ...formData,
      year: formData.year,
    };

    if (formData.locationType === 'Workshop') {
      dataToSubmit.siteCompany = '';
      dataToSubmit.siteArea = '';
      dataToSubmit.siteContactPerson = '';
      dataToSubmit.siteContactNumber = '';
    }

    onSubmit(dataToSubmit);
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
        <div className="grid gap-2">
            <Label htmlFor="equipmentType">Equipment Type</Label>
            <Input id="equipmentType" value={formData.equipmentType} onChange={handleInputChange} placeholder="e.g., Reach Truck" />
        </div>
        
        <Separator />
        
        <div className="grid gap-4">
          <h3 className="text-lg font-medium">Location Details</h3>
           <div className="grid gap-2">
              <Label htmlFor="locationType">Location</Label>
              <Select onValueChange={handleLocationChange} value={formData.locationType}>
                  <SelectTrigger id="locationType">
                      <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="On-Site">On-Site</SelectItem>
                  </SelectContent>
              </Select>
           </div>

          {formData.locationType === 'On-Site' && (
            <div className="grid gap-4 mt-2 border-l-2 border-primary pl-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-2 col-span-2">
                    <Label htmlFor="siteCompany">Site / Company</Label>
                    <Input id="siteCompany" value={formData.siteCompany} onChange={handleInputChange} placeholder="e.g., ACME Corp" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="siteArea">Area</Label>
                    <Input id="siteArea" value={formData.siteArea} onChange={handleInputChange} placeholder="e.g., Downtown" />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="siteContactPerson">Contact Person</Label>
                    <Input id="siteContactPerson" value={formData.siteContactPerson} onChange={handleInputChange} placeholder="e.g., Jane Smith" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="siteContactNumber">Contact Number</Label>
                    <Input id="siteContactNumber" value={formData.siteContactNumber} onChange={handleInputChange} placeholder="e.g., +1 555-1234" />
                  </div>
                </div>
            </div>
          )}
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
