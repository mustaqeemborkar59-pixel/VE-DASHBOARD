'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Company, Employee, Forklift, JobCard } from "@/lib/data";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";

export type JobCardFormData = Omit<JobCard, 'id' | 'creationDate'>;

interface JobCardFormProps {
    onSubmit: (data: Partial<JobCardFormData>) => void;
    onCancel: () => void;
    initialData?: JobCard;
    mode: 'add' | 'edit';
    companies: Company[];
    forklifts: Forklift[];
    employees: Employee[];
}

export function JobCardForm({ onSubmit, onCancel, initialData, mode, companies, forklifts, employees }: JobCardFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<JobCardFormData>>({
        jobTitle: '',
        companyId: '',
        forkliftId: '',
        employeeId: '',
        status: 'Pending',
        jobDescription: '',
        technicianNotes: '',
        completionDate: '',
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setFormData({
                jobTitle: initialData.jobTitle,
                companyId: initialData.companyId,
                forkliftId: initialData.forkliftId,
                employeeId: initialData.employeeId,
                status: initialData.status,
                jobDescription: initialData.jobDescription,
                technicianNotes: initialData.technicianNotes,
                completionDate: initialData.completionDate ? format(new Date(initialData.completionDate), 'yyyy-MM-dd') : '',
            });
        } else {
            setFormData({
                jobTitle: '',
                companyId: '',
                forkliftId: '',
                employeeId: '',
                status: 'Pending',
                jobDescription: '',
                technicianNotes: '',
                completionDate: '',
            });
        }
    }, [initialData, mode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: keyof JobCardFormData, value: string) => {
        if (id === 'employeeId' && value === '__none__') {
            setFormData(prev => ({ ...prev, employeeId: '' }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.jobTitle || !formData.companyId || !formData.forkliftId || !formData.jobDescription) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill out title, company, forklift, and description.",
            });
            return;
        }
        onSubmit(formData);
    };

    const filteredForklifts = formData.companyId
        ? forklifts.filter(f => f.siteCompany === companies.find(c => c.id === formData.companyId)?.name || f.locationType === 'Workshop')
        : forklifts;

    return (
        <form id="job-card-form" onSubmit={handleSubmit} className="grid gap-6 py-4">
            <div className="grid gap-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={formData.jobTitle || ''} onChange={handleInputChange} placeholder="e.g., Engine check for Forklift X" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="companyId">Company</Label>
                    <Select value={formData.companyId || ''} onValueChange={(value) => handleSelectChange('companyId', value)} required>
                        <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                        <SelectContent>
                            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="forkliftId">Forklift</Label>
                    <Select value={formData.forkliftId || ''} onValueChange={(value) => handleSelectChange('forkliftId', value)} required disabled={!formData.companyId}>
                        <SelectTrigger><SelectValue placeholder="Select a forklift" /></SelectTrigger>
                        <SelectContent>
                            {filteredForklifts.map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                    {f.serialNumber} ({f.make} {f.model}) - {f.siteCompany || f.locationType}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" value={formData.jobDescription || ''} onChange={handleInputChange} placeholder="Describe the issue or work to be done." required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="employeeId">Assign To</Label>
                    <Select value={formData.employeeId || ''} onValueChange={(value) => handleSelectChange('employeeId', value)}>
                        <SelectTrigger><SelectValue placeholder="Assign a technician" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {employees.filter(e => e.availability).map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status || 'Pending'} onValueChange={(value) => handleSelectChange('status', value as JobCard['status'])} required>
                        <SelectTrigger><SelectValue placeholder="Set status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="technicianNotes">Technician Notes</Label>
                <Textarea id="technicianNotes" value={formData.technicianNotes || ''} onChange={handleInputChange} placeholder="Updates from the technician..." />
            </div>
            
             <div className="grid gap-2">
                <Label htmlFor="completionDate">Completion Date</Label>
                <Input id="completionDate" type="date" value={formData.completionDate || ''} onChange={handleInputChange} />
            </div>

        </form>
    );
}
