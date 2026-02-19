
'use client';

import { useEffect, useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Forklift, Company } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { format, parseISO } from "date-fns";


export type ForkliftFormData = {
  serialNumber: string;
  make: string;
  model: string;
  year: string;
  capacity: string;
  equipmentType: string;
  firm: 'Vithal' | 'RV' | '';
  voltage: string;
  mastHeight: string;
  locationType: 'Workshop' | 'On-Site' | 'Not Confirm';
  locationAssignmentDate: string;
  siteCompany: string;
  siteArea: string;
  siteContactPerson: string;
  siteContactNumber: string;
  remarks: string;
  poPiNumber: string;
};

interface ForkliftFormProps {
  onSubmit: (data: Partial<ForkliftFormData>) => void;
  onCancel: () => void;
  initialData?: Forklift;
  mode: 'add' | 'edit';
  companies: Company[];
  isLoadingCompanies: boolean;
}

export function ForkliftForm({ onSubmit, onCancel, initialData, mode, companies, isLoadingCompanies }: ForkliftFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ForkliftFormData>({
    serialNumber: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    equipmentType: '',
    firm: '',
    voltage: '',
    mastHeight: '',
    locationType: 'Workshop',
    locationAssignmentDate: '',
    siteCompany: '',
    siteArea: '',
    siteContactPerson: '',
    siteContactNumber: '',
    remarks: '',
    poPiNumber: '',
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        serialNumber: initialData.serialNumber ?? '',
        make: initialData.make ?? '',
        model: initialData.model ?? '',
        year: initialData.year?.toString() ?? '',
        capacity: initialData.capacity ?? '',
        equipmentType: initialData.equipmentType ?? '',
        firm: initialData.firm ?? '',
        voltage: initialData.voltage ?? '',
        mastHeight: initialData.mastHeight ?? '',
        locationType: initialData.locationType ?? 'Workshop',
        locationAssignmentDate: initialData.locationAssignmentDate || new Date().toISOString(),
        siteCompany: initialData.siteCompany ?? '',
        siteArea: initialData.siteArea ?? '',
        siteContactPerson: initialData.siteContactPerson ?? '',
        siteContactNumber: initialData.siteContactNumber ?? '',
        remarks: initialData.remarks ?? '',
        poPiNumber: initialData.poPiNumber ?? '',
      });
    } else if (mode === 'add') {
        setFormData({
            serialNumber: '',
            make: '',
            model: '',
            year: '',
            capacity: '',
            equipmentType: '',
            firm: '',
            voltage: '',
            mastHeight: '',
            locationType: 'Workshop',
            locationAssignmentDate: new Date().toISOString(),
            siteCompany: '',
            siteArea: '',
            siteContactPerson: '',
            siteContactNumber: '',
            remarks: '',
            poPiNumber: '',
        });
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleLocationChange = (value: ForkliftFormData['locationType']) => {
    setFormData(prev => ({ 
        ...prev, 
        locationType: value,
        locationAssignmentDate: new Date().toISOString()
    }));
  };

  const handleSiteCompanyChange = (value: string) => {
    setFormData(prev => ({ ...prev, siteCompany: value }));
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
    
    const dataToSubmit: Partial<ForkliftFormData> = {
      ...formData,
      year: formData.year,
    };

    if (formData.locationType === 'Workshop' || formData.locationType === 'Not Confirm') {
      dataToSubmit.siteCompany = '';
      dataToSubmit.siteArea = '';
      dataToSubmit.siteContactPerson = '';
      dataToSubmit.siteContactNumber = '';
    }

    onSubmit(dataToSubmit);
  };
  
  const radioCardBaseClasses = "flex w-auto items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-all";
  const radioCardSelectedClasses = ""; // Removed ring/border color override to keep it simple as requested


  return (
    <form id="forklift-form" onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="e.g., F12345" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="poPiNumber">PO/PI Number</Label>
                <Input id="poPiNumber" value={formData.poPiNumber} onChange={handleInputChange} placeholder="e.g., PO-789" />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={formData.make} onChange={handleInputChange} placeholder="e.g., Toyota" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., 8FGCU25" required />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" value={formData.year} onChange={handleInputChange} placeholder="e.g., 2021" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" value={formData.capacity} onChange={handleInputChange} placeholder="e.g., 5000 lbs" />
            </div>
        </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="voltage">Voltage</Label>
                <Input id="voltage" value={formData.voltage} onChange={handleInputChange} placeholder="e.g., 36V" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="mastHeight">Mast Height</Label>
                <Input id="mastHeight" value={formData.mastHeight} onChange={handleInputChange} placeholder="e.g., 189 inches" />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
              <Label htmlFor="equipmentType">Equipment Type</Label>
              <Input id="equipmentType" value={formData.equipmentType} onChange={handleInputChange} placeholder="e.g., Reach Truck" />
          </div>
           <div className="grid gap-2">
              <Label htmlFor="firm">Firm</Label>
              <RadioGroup
                  value={formData.firm || '__none__'}
                  onValueChange={(value) => {
                      const firmValue = value === '__none__' ? '' : value as 'Vithal' | 'RV';
                      setFormData(prev => ({...prev, firm: firmValue}));
                  }}
                  className="flex flex-wrap gap-2"
              >
                  <Label className={cn(radioCardBaseClasses, "border-muted bg-muted/50 text-muted-foreground", formData.firm === '' && "bg-muted text-foreground border-foreground/20")}>
                      <RadioGroupItem value="__none__" id="firm-none" className="sr-only" />
                      <span>None</span>
                  </Label>
                  <Label className={cn(radioCardBaseClasses, "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400", formData.firm === 'Vithal' && "bg-red-100 border-red-500/50")}>
                      <RadioGroupItem value="Vithal" id="firm-vithal" className="sr-only" />
                      <span>Vithal</span>
                  </Label>
                  <Label className={cn(radioCardBaseClasses, "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400", formData.firm === 'RV' && "bg-blue-100 border-blue-500/50")}>
                      <RadioGroupItem value="RV" id="firm-rv" className="sr-only" />
                      <span>RV</span>
                  </Label>
              </RadioGroup>
          </div>
        </div>
        
        <Separator />
        
        <div className="grid gap-4">
          <h3 className="text-lg font-medium">Location Details</h3>
           <div className="grid gap-2">
                <RadioGroup
                    value={formData.locationType}
                    onValueChange={handleLocationChange}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                    <Label className={cn(radioCardBaseClasses, 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300', formData.locationType === 'Workshop' && 'bg-orange-200 border-orange-500/50')}>
                        <RadioGroupItem value="Workshop" id="Workshop" className="sr-only" />
                        <span className="font-medium">Workshop</span>
                    </Label>
                     <Label className={cn(radioCardBaseClasses, 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300', formData.locationType === 'On-Site' && 'bg-green-200 border-green-500/50')}>
                        <RadioGroupItem value="On-Site" id="On-Site" className="sr-only" />
                        <span className="font-medium">On-Site</span>
                    </Label>
                    <Label className={cn(radioCardBaseClasses, 'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300', formData.locationType === 'Not Confirm' && 'bg-red-200 border-red-500/50')}>
                        <RadioGroupItem value="Not Confirm" id="Not Confirm" className="sr-only" />
                        <span className="font-medium">Not Confirmed</span>
                    </Label>
                </RadioGroup>
           </div>

           <div className="grid gap-2 max-w-xs">
                <Label htmlFor="locationAssignmentDate">Location Set Date</Label>
                <Input
                    id="locationAssignmentDate"
                    type="datetime-local"
                    value={formData.locationAssignmentDate ? format(parseISO(formData.locationAssignmentDate), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                            setFormData(prev => ({ ...prev, locationAssignmentDate: date.toISOString() }));
                        }
                    }}
                />
                <p className="text-[10px] text-muted-foreground">Changes automatically when location type changes, or set manually.</p>
            </div>

          {formData.locationType === 'On-Site' && (
            <div className="grid gap-4 mt-2 border-l-2 border-primary pl-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="grid gap-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="siteCompany">Site / Company</Label>
                      <div className="flex w-full items-center">
                        <Input
                          id="siteCompany"
                          placeholder="Type or select a company"
                          value={formData.siteCompany}
                          onChange={handleInputChange}
                          className="rounded-r-none"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="rounded-l-none border-l-0">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <ScrollArea className="h-72">
                                {isLoadingCompanies ? (
                                <DropdownMenuItem disabled>Loading companies...</DropdownMenuItem>
                                ) : companies.length > 0 ? (
                                    companies.map((company, index) => (
                                        <Fragment key={company.id}>
                                            <DropdownMenuItem
                                            onSelect={() => handleSiteCompanyChange(company.name)}
                                            >
                                            {company.name}
                                            </DropdownMenuItem>
                                            {index < companies.length - 1 && <DropdownMenuSeparator />}
                                        </Fragment>
                                    ))
                                ) : (
                                  <DropdownMenuItem disabled>No companies found.</DropdownMenuItem>
                                )}
                            </ScrollArea>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                  </div>
                  <div className="grid gap-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="siteArea">Area</Label>
                    <Input id="siteArea" value={formData.siteArea} onChange={handleInputChange} placeholder="e.g., Downtown" />
                  </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        
        <Separator />

        <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Add any extra notes or remarks here..." />
        </div>
    </form>
  );
}
