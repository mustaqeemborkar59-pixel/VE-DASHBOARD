'use client';
import { useMemo } from 'react';
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
import { Company, Forklift, Invoice } from "@/lib/data";
import { Building, ReceiptText, DollarSign } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/app-layout";
import { ForkliftIcon } from '@/components/icons/forklift-icon';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { firestore } = useFirebase();

  // Queries
  const forkliftsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'forklifts')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies')) : null, [firestore]);
  const invoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc')) : null, [firestore]);
  const recentInvoicesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invoices'), orderBy('billDate', 'desc'), limit(5)) : null, [firestore]);

  // Data fetching
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);
  const { data: recentInvoices, isLoading: isLoadingRecentInvoices } = useCollection<Invoice>(recentInvoicesQuery);

  const isLoading = isLoadingForklifts || isLoadingCompanies || isLoadingInvoices || isLoadingRecentInvoices;

  // Stats calculation
  const stats = useMemo(() => {
    const totalForklifts = forklifts?.length || 0;
    const totalCompanies = companies?.length || 0;

    const currentMonth = format(new Date(), 'yyyy-MM');
    const invoicesThisMonth = invoices?.filter(inv => (inv.billingMonth || format(parseISO(inv.billDate), 'yyyy-MM')) === currentMonth) || [];
    
    const monthlyRevenue = invoicesThisMonth.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const totalInvoicesThisMonth = invoicesThisMonth.length;
    
    return { totalForklifts, totalCompanies, monthlyRevenue, totalInvoicesThisMonth };
  }, [forklifts, companies, invoices]);
  
  // Chart data
  const forkliftLocationData = useMemo(() => {
    if (!forklifts) return [];
    const counts = {
      Workshop: 0,
      'On-Site': 0,
      'Not Confirm': 0,
    };
    forklifts.forEach(f => {
      if (f.locationType in counts) {
        counts[f.locationType]++;
      }
    });
    return [
      { name: 'Workshop', value: counts.Workshop },
      { name: 'On-Site', value: counts['On-Site'] },
      { name: 'Not Confirmed', value: counts['Not Confirm'] },
    ].filter(item => item.value > 0);
  }, [forklifts]);

  const COLORS = {
      'Workshop': '#22c55e', // green-500
      'On-Site': '#f97316', // orange-500
      'Not Confirmed': '#ef4444' // red-500
  };

  const getCompanyDetails = (companyId: string) => {
    return companies?.find(c => c.id === companyId);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  const cardClassName = "border-0 bg-gradient-to-br shadow-lg";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">A high-level overview of your workshop's activities.</p>
            </div>
          </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={cn(cardClassName, "from-blue-500 to-indigo-600 text-white shadow-blue-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forklifts</CardTitle>
              <ForkliftIcon className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '...' : stats.totalForklifts}</div>
              <p className="text-xs text-white/90">Units in your fleet</p>
            </CardContent>
          </Card>
          <Card className={cn(cardClassName, "from-violet-500 to-purple-600 text-white shadow-violet-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client Companies</CardTitle>
              <Building className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '...' : stats.totalCompanies}</div>
              <p className="text-xs text-white/90">Total registered companies</p>
            </CardContent>
          </Card>
           <Card className={cn(cardClassName, "from-emerald-500 to-green-600 text-white shadow-emerald-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
              <DollarSign className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '...' : formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-white/90">From {stats.totalInvoicesThisMonth} invoices</p>
            </CardContent>
          </Card>
          <Card className={cn(cardClassName, "from-amber-500 to-orange-600 text-white shadow-amber-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices (This Month)</CardTitle>
              <ReceiptText className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '...' : stats.totalInvoicesThisMonth}</div>
              <p className="text-xs text-white/90">New invoices generated</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>
                        The last 5 invoices that were created.
                    </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/billing">
                        View All
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0 md:p-3 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Loading recent invoices...</TableCell>
                    </TableRow>
                  ) : recentInvoices && recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">{invoice.billNo}-{invoice.billNoSuffix || 'MHE'}</div>
                          <div className="text-sm text-muted-foreground hidden md:inline">{invoice.enterprise}</div>
                        </TableCell>
                        <TableCell>{getCompanyDetails(invoice.companyId)?.name || 'Unknown'}</TableCell>
                        <TableCell className="hidden md:table-cell">{format(parseISO(invoice.billDate), 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.grandTotal)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">No invoices found.</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-3">
              <CardHeader>
                  <CardTitle>Fleet Distribution</CardTitle>
                  <CardDescription>Overview of forklift locations.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                   <div className="h-[250px] w-full flex items-center justify-center">
                     <p className="text-muted-foreground">Loading chart...</p>
                   </div>
                ) : forkliftLocationData.length > 0 ? (
                   <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={forkliftLocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {forkliftLocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          background: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))"
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] w-full flex items-center justify-center">
                     <p className="text-muted-foreground">No forklift data available.</p>
                   </div>
                )}
              </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
