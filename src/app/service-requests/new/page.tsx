'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCollection, useFirebase, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function NewServiceRequestPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const [selectedForklift, setSelectedForklift] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !selectedForklift || !issueDescription) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a forklift and describe the issue.",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const serviceRequestsCollection = collection(firestore, 'serviceRequests');
      await addDocumentNonBlocking(serviceRequestsCollection, {
        forkliftId: selectedForklift,
        issueDescription: issueDescription,
        status: 'Pending',
        requestDate: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Service request submitted successfully.",
      });

      router.push('/service-requests');
    } catch (error) {
      console.error("Error creating service request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit service request. Please try again.",
      });
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/service-requests">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
              <div>
                <CardTitle>New Service Request</CardTitle>
                <CardDescription>Fill out the form to request maintenance for a forklift.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="forklift">Forklift</Label>
                <Select onValueChange={setSelectedForklift} value={selectedForklift}>
                  <SelectTrigger id="forklift">
                    <SelectValue placeholder="Select a forklift" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingForklifts ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      forklifts?.map(forklift => (
                        <SelectItem key={forklift.id} value={forklift.id}>
                          {forklift.model} ({forklift.serialNumber})
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/service-requests">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
