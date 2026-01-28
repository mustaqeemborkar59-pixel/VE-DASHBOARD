'use client';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { Invoice, Company, MonthlyRepair } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [repairCount, setRepairCount] = useState('');

  // Queries
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies')) : null, [firestore]);
  const monthlyRepairsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'monthlyRepairs'), orderBy('id', 'asc')) : null, [firestore]);

  // Data fetching
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: monthlyRepairs, isLoading: isLoadingRepairs } = useCollection<MonthlyRepair>(monthlyRepairsQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies || isLoadingRepairs;

  const handleSaveData = async () => {
    if (!firestore) return;
    const count = parseInt(repairCount, 10);
    if (!selectedMonth || isNaN(count) || count < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a month and enter a valid number of repairs.',
      });
      return;
    }
    
    try {
      const docRef = doc(firestore, 'monthlyRepairs', selectedMonth);
      await setDoc(docRef, { repairs: count });
      toast({
        title: 'Data Saved',
        description: `Repair data for ${format(parseISO(selectedMonth), 'MMMM yyyy')} has been saved.`,
      });
      setRepairCount('');
    } catch (error) {
      console.error("Error saving repair data:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save repair data. Please check permissions.',
      });
    }
  };
  
  const monthlyRepairsChartData = useMemo(() => {
    if (!monthlyRepairs) return [];
    
    return monthlyRepairs
      .map(item => ({
        month: format(parseISO(item.id), 'MMM yyyy'),
        repairs: item.repairs,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12); // Show last 12 months
  }, [monthlyRepairs]);

  const revenueByCompanyData = useMemo(() => {
    if (!invoices || !companies) return [];

    const companyRevenue = invoices.reduce((acc, invoice) => {
        const companyName = companies.find(c => c.id === invoice.companyId)?.name || 'Unknown Company';
        acc[companyName] = (acc[companyName] || 0) + invoice.grandTotal;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(companyRevenue)
        .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Show top 10 companies
  }, [invoices, companies]);

  const renderLoader = () => (
    <div className="h-[300px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading report data...</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Enter Monthly Repair Data</CardTitle>
                    <CardDescription>Manually input the total number of repairs for a specific month.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="month-input">Month</Label>
                        <Input
                            id="month-input"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="repair-count">Number of Repairs</Label>
                        <Input
                            id="repair-count"
                            type="number"
                            value={repairCount}
                            onChange={(e) => setRepairCount(e.target.value)}
                            placeholder="e.g., 50"
                        />
                     </div>
                     <Button onClick={handleSaveData}>Save Data</Button>
                </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Monthly Repairs</CardTitle>
                <CardDescription>Total repair and maintenance jobs per month (from manual entry).</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingRepairs ? renderLoader() : (
                    <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRepairsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent))' }}
                            contentStyle={{
                                background: "hsl(var(--background))",
                                borderColor: "hsl(var(--border))"
                            }}
                        />
                        <Bar dataKey="repairs" fill="hsl(var(--primary))" name="Repairs" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Top 10 Clients by Revenue</CardTitle>
                <CardDescription>Your most valuable clients based on total billing.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoadingInvoices || isLoadingCompanies ? renderLoader() : (
                    <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByCompanyData} layout="vertical" margin={{ right: 30, left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            width={120} 
                            fontSize={12}
                            tick={{ width: 110, textOverflow: 'ellipsis', overflow: 'hidden' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent))' }}
                            contentStyle={{
                                background: "hsl(var(--background))",
                                borderColor: "hsl(var(--border))"
                            }}
                             formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))}
                        />
                        <Bar dataKey="revenue" name="Total Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                 )}
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Parts Consumption</CardTitle>
                <CardDescription>Analysis of parts used in maintenance.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center text-muted-foreground">
                    <p className="font-semibold">Feature Under Development</p>
                    <p className="text-sm mt-2 max-w-sm mx-auto">
                        To accurately track parts consumption, invoice items need to be linked to your inventory. Currently, they are stored as free text.
                    </p>
                </div>
            </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
