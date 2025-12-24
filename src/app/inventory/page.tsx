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
import { Part } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import AppLayout from "@/components/app-layout";

export default function InventoryPage() {
  const { firestore } = useFirebase();

  const partsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parts') : null, [firestore]);
  const { data: parts, isLoading } = useCollection<Part>(partsQuery);

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>Track and manage your forklift parts.</CardDescription>
            </div>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Part
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sr.</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
              ) : (
                  parts?.map((part, index) => (
                  <TableRow key={part.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{part.id}</TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell className="text-right">{part.quantity}</TableCell>
                      <TableCell className="text-right">${part.unitPrice.toFixed(2)}</TableCell>
                  </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
