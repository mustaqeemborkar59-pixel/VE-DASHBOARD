'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Forklift } from "@/lib/data";
import Link from 'next/link';
import { PlusCircle } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export default function ForkliftsPage() {
  const { firestore } = useFirebase();

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading } = useCollection<Forklift>(forkliftsQuery);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Forklifts</CardTitle>
            <CardDescription>Manage your fleet of forklifts.</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/forklifts/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Forklift
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial Number</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Equipment Type</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Capacity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : (
              forklifts?.map((forklift) => (
                <TableRow key={forklift.id}>
                  <TableCell className="font-medium">{forklift.serialNumber}</TableCell>
                  <TableCell>{forklift.make}</TableCell>
                  <TableCell>{forklift.model}</TableCell>
                  <TableCell>{forklift.equipmentType}</TableCell>
                  <TableCell>{forklift.year}</TableCell>
                  <TableCell>{forklift.capacity}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
