'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Forklift } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

export type ServiceRequestFormData = {
  forkliftId: string;
  issueDescription: string;
};

interface ServiceRequestFormProps {
  forklifts: Forklift[];
  isLoadingForklifts: boolean;
  onSubmit: (data: ServiceRequestFormData) => void;
  onCancel: () => void;
}

export function ServiceRequestForm({
  forklifts,
  isLoadingForklifts,
  onSubmit,
  onCancel,
}: ServiceRequestFormProps) {
  const { toast } = useToast();
  const [forkliftId, setForkliftId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkliftId || !issueDescription) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a forklift and describe the issue.",
      });
      return;
    }
    setIsSubmitting(true);
    onSubmit({ forkliftId, issueDescription });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="forklift">Forklift</Label>
        <Select onValueChange={setForkliftId} value={forkliftId}>
          <SelectTrigger id="forklift">
            <SelectValue placeholder="Select a forklift" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingForklifts ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : (
              forklifts.map(forklift => (
                <SelectItem key={forklift.id} value={forklift.id}>
                  {forklift.make} {forklift.model} ({forklift.serialNumber})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issue">Issue Description</Label>
        <Textarea
          id="issue"
          placeholder="Describe the issue in detail..."
          className="min-h-32"
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
