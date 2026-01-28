'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
import AppLayout from "@/components/app-layout";

// Mock Data
const monthlyRepairsData = [
  { month: 'Jan', repairs: 30 },
  { month: 'Feb', repairs: 45 },
  { month: 'Mar', repairs: 60 },
  { month: 'Apr', repairs: 50 },
  { month: 'May', repairs: 70 },
  { month: 'Jun', repairs: 85 },
];

const partsConsumptionData = [
  { partName: 'Hydraulic Filter', quantity: 120 },
  { partName: 'Spark Plugs', quantity: 95 },
  { partName: 'Brake Pads', quantity: 80 },
  { partName: 'Engine Oil (Liters)', quantity: 250 },
  { partName: 'Tires', quantity: 40 },
];


export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Repairs Summary</CardTitle>
            <CardDescription>Number of repair and maintenance jobs per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRepairsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))"
                    }}
                />
                <Legend />
                <Bar dataKey="repairs" fill="hsl(var(--primary))" name="Repairs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parts Consumption</CardTitle>
            <CardDescription>Most frequently used parts in repairs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead className="text-right">Quantity Consumed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsConsumptionData.map((part) => (
                  <TableRow key={part.partName}>
                    <TableCell className="font-medium">{part.partName}</TableCell>
                    <TableCell className="text-right">{part.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
