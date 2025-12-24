'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Forklift } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false)

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

  const selectedForkliftLabel = () => {
    if (!forkliftId) return "Select a forklift...";
    const forklift = forklifts.find((f) => f.id === forkliftId);
    if (!forklift) return "Select a forklift...";
    return `${forklift.make} ${forklift.model} (${forklift.serialNumber})`
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="forklift">Forklift</Label>
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={isLoadingForklifts}
                >
                  <span className="truncate">
                    {selectedForkliftLabel()}
                  </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search by make, model, or serial no..." />
                    <CommandList>
                        <CommandEmpty>{isLoadingForklifts ? "Loading forklifts..." : "No forklift found."}</CommandEmpty>
                        <CommandGroup>
                        {forklifts.map((forklift) => (
                            <CommandItem
                                key={forklift.id}
                                value={forklift.id}
                                onSelect={(currentValue) => {
                                    setForkliftId(currentValue === forkliftId ? "" : currentValue)
                                    setOpen(false)
                                }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                forkliftId === forklift.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <div className="flex flex-col">
                               <span className="font-medium">{forklift.make} {forklift.model}</span>
                               <span className="text-xs text-muted-foreground">{forklift.serialNumber}</span>
                            </div>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
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
