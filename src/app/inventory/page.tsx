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

export default function InventoryPage() {
  const { firestore } = useFirebase();

  const partsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'parts') : null, [firestore]);
  const { data: parts, isLoading } = useCollection<Part>(partsQuery);

  return (
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
            ) : (
                parts?.map((part) => (
                <TableRow key={part.id}>
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
  );
}
