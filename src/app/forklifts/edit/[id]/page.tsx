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

  const [serialNumber, setSerialNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (forklift) {
      setSerialNumber(forklift.serialNumber);
      setMake(forklift.make);
      setModel(forklift.model);
      setYear(forklift.year.toString());
      setCapacity(forklift.capacity || '');
      setEquipmentType(forklift.equipmentType || '');
    }
  }, [forklift]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !serialNumber || !make || !model || !year) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required fields.",
      });
      return;
    }
    setIsSubmitting(true);

    if (!forkliftDocRef) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Forklift reference not found.",
        });
        setIsSubmitting(false);
        return;
    }

    updateDocumentNonBlocking(forkliftDocRef, {
      serialNumber,
      make,
      model,
      year: parseInt(year, 10),
      capacity,
      equipmentType,
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
                <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g., F12345" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g., Toyota" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., 8FGCU25" required />
                </div>
              </div>
               <div className="grid gap-2">
                <Label htmlFor="equipmentType">Equipment Type</Label>
                <Input id="equipmentType" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} placeholder="e.g., Reach Truck" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2021" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g., 5000 lbs" />
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
