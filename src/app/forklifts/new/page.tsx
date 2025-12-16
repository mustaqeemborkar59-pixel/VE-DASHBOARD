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
import { useFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function NewForkliftPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [serialNumber, setSerialNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const forkliftsCollection = collection(firestore, 'forklifts');
      await addDocumentNonBlocking(forkliftsCollection, {
        serialNumber,
        make,
        model,
        year: parseInt(year, 10),
        capacity,
        equipmentType,
      });

      toast({
        title: "Success",
        description: "Forklift added successfully.",
      });

      router.push('/forklifts');
    } catch (error) {
      console.error("Error creating forklift:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add forklift. Please try again.",
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
                <Link href="/forklifts">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
              <div>
                <CardTitle>Add New Forklift</CardTitle>
                <CardDescription>Fill out the form to add a new forklift to your fleet.</CardDescription>
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
              {isSubmitting ? 'Adding...' : 'Add Forklift'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
