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
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Forklift } from "@/lib/data";

type ForkliftFormData = {
    serialNumber: string;
    make: string;
    model: string;
    year: string;
    capacity: string;
    equipmentType: string;
}

export default function EditForkliftPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const forkliftId = params.id as string;

  const forkliftDocRef = useMemoFirebase(
    () => (firestore && forkliftId ? doc(firestore, "forklifts", forkliftId) : null),
    [firestore, forkliftId]
  );
  const { data: forklift, isLoading: isLoadingForklift } = useDoc<Forklift>(forkliftDocRef);

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
    if (forklift) {
      setFormData({
        serialNumber: forklift.serialNumber,
        make: forklift.make,
        model: forklift.model,
        year: forklift.year.toString(),
        capacity: forklift.capacity || '',
        equipmentType: forklift.equipmentType || '',
      });
    }
  }, [forklift]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formData.serialNumber || !formData.make || !formData.model || !formData.year) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required fields.",
      });
      return;
    }
    
    if (!forkliftDocRef) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Forklift reference not found.",
        });
        return;
    }
    
    setIsSubmitting(true);

    updateDocumentNonBlocking(forkliftDocRef, {
      ...formData,
      year: parseInt(formData.year, 10),
    });

    toast({
      title: "Success",
      description: "Forklift updated successfully.",
    });

    router.push('/forklifts');
  };

  if (isLoadingForklift) {
    return (
      <div className="flex justify-center items-start pt-8">
        <p>Loading forklift details...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/forklifts">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
              <div>
                <CardTitle>Edit Forklift</CardTitle>
                <CardDescription>Update the details of your forklift.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/forklifts">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Forklift'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
