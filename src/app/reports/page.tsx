'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy }from 'firebase/firestore';
import { Invoice, Company } from '@/lib/data';
import { format, parseISO } from 'date-fns';

export default function ReportsPage() {
  const { firestore } = useFirebase();

  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies')) : null, [firestore]);

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);

  const isLoading = isLoadingInvoices || isLoadingCompanies;

  const monthlyRepairsData = useMemo(() => {
    if (!invoices) return [];
    
    const monthlyData = invoices.reduce((acc, invoice) => {
      const month = format(parseISO(invoice.billDate), 'yyyy-MM');
      acc[month] = (acc[month] || 0) + 1; // Count invoices (repairs)
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData)
      .map(([month, repairs]) => ({
        month: format(parseISO(month), 'MMM yyyy'),
        repairs: repairs,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12); // Show last 12 months
  }, [invoices]);

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
        <Card>
          <CardHeader>
            <CardTitle>Monthly Repairs</CardTitle>
            <CardDescription>Total repair and maintenance jobs per month over the last year.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? renderLoader() : (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRepairsData}>
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

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Top 10 Clients by Revenue</CardTitle>
                <CardDescription>Your most valuable clients based on total billing.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? renderLoader() : (
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
