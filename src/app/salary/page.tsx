
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Employee, Salary, CompanySettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlusCircle, Search, Download, Pencil, Trash2, Banknote, FileText, WalletCards, XCircle, Calculator } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateSalaryPdfSlip } from '@/lib/salary-pdf-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

type Enterprise = 'Vithal' | 'RV';

export default function SalaryPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Enterprise>('Vithal');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Earnings
  const [baseSalary, setBaseSalary] = useState('0'); // Basic
  const [da, setDa] = useState('0');
  const [hra, setHra] = useState('0');
  const [ot, setOt] = useState('0');
  
  // Deductions
  const [pf, setPf] = useState('0');
  const [esic, setEsic] = useState('0');
  const [pt, setPt] = useState('0');
  const [lwf, setLwf] = useState('0');
  const [advance, setAdvance] = useState('0');

  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [notes, setNotes] = useState('');

  // Data fetching
  const employeesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'employees'), orderBy('fullName')) : null, [firestore, user]);
  const salariesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'salaries'), orderBy('month', 'desc')) : null, [firestore, user]);
  
  const vithalSettingsRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'companySettings', 'vithal') : null, [firestore, user]);
  const rvSettingsRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'companySettings', 'rv') : null, [firestore, user]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
  const { data: salaries, isLoading: isLoadingSalaries } = useCollection<Salary>(salariesQuery);
  const { data: vithalSettings } = useDoc<CompanySettings>(vithalSettingsRef);
  const { data: rvSettings } = useDoc<CompanySettings>(rvSettingsRef);

  const calculations = useMemo(() => {
    const basic = parseFloat(baseSalary) || 0;
    const v_da = parseFloat(da) || 0;
    const v_hra = parseFloat(hra) || 0;
    const v_ot = parseFloat(ot) || 0;
    
    const v_pf = parseFloat(pf) || 0;
    const v_esic = parseFloat(esic) || 0;
    const v_pt = parseFloat(pt) || 0;
    const v_lwf = parseFloat(lwf) || 0;
    const v_advance = parseFloat(advance) || 0;

    const grossEarnings = basic + v_da + v_hra + v_ot;
    const grossDeductions = v_pf + v_esic + v_pt + v_lwf + v_advance;
    const netPay = Math.max(0, grossEarnings - grossDeductions);

    return { grossEarnings, grossDeductions, netPay };
  }, [baseSalary, da, hra, ot, pf, esic, pt, lwf, advance]);

  const filteredSalaries = useMemo(() => {
    if (!salaries) return [];
    return salaries.filter(s => {
      const emp = employees?.find(e => e.id === s.employeeId);
      const nameMatch = emp?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const monthMatch = monthFilter === 'All' || s.month === monthFilter;
      const enterpriseMatch = s.enterprise === activeTab;
      return nameMatch && monthMatch && enterpriseMatch;
    });
  }, [salaries, employees, searchTerm, monthFilter, activeTab]);

  const resetForm = useCallback(() => {
    setEmployeeId('');
    setMonth(format(new Date(), 'yyyy-MM'));
    setBaseSalary('0');
    setDa('0');
    setHra('0');
    setOt('0');
    setPf('0');
    setEsic('0');
    setPt('0');
    setLwf('0');
    setAdvance('0');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setStatus('Paid');
    setNotes('');
    setEditingSalary(null);
  }, []);

  const handleOpenForm = (salary: Salary | null) => {
    if (salary) {
      setEditingSalary(salary);
      setEmployeeId(salary.employeeId);
      setMonth(salary.month);
      setBaseSalary(salary.baseSalary?.toString() || '0');
      setDa(salary.da?.toString() || '0');
      setHra(salary.hra?.toString() || '0');
      setOt(salary.ot?.toString() || '0');
      setPf(salary.pf?.toString() || '0');
      setEsic(salary.esic?.toString() || '0');
      setPt(salary.pt?.toString() || '0');
      setLwf(salary.lwf?.toString() || '0');
      setAdvance(salary.advance?.toString() || '0');
      setPaymentDate(salary.paymentDate || '');
      setStatus(salary.status);
      setNotes(salary.notes || '');
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!employeeId || !month) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill required fields.' });
      return;
    }

    const salaryData: Omit<Salary, 'id'> = {
      employeeId,
      enterprise: activeTab,
      month,
      baseSalary: parseFloat(baseSalary) || 0,
      da: parseFloat(da) || 0,
      hra: parseFloat(hra) || 0,
      ot: parseFloat(ot) || 0,
      pf: parseFloat(pf) || 0,
      esic: parseFloat(esic) || 0,
      pt: parseFloat(pt) || 0,
      lwf: parseFloat(lwf) || 0,
      advance: parseFloat(advance) || 0,
      netSalary: calculations.netPay,
      paymentDate,
      status,
      notes,
      createdAt: editingSalary?.createdAt || new Date().toISOString(),
    };

    if (firestore) {
      if (editingSalary) {
        updateDocumentNonBlocking(doc(firestore, 'salaries', editingSalary.id), salaryData);
        toast({ title: 'Success', description: 'Salary updated successfully.' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'salaries'), salaryData);
        toast({ title: 'Success', description: 'Salary record added.' });
      }
      setIsFormOpen(false);
    }
  };

  const handleDeleteSalary = () => {
    if (firestore && salaryToDelete) {
      deleteDocumentNonBlocking(doc(firestore, 'salaries', salaryToDelete.id));
      toast({ title: 'Deleted', description: 'Salary record removed.' });
      setSalaryToDelete(null);
    }
  };

  const handleDownloadPdfSlip = async (salary: Salary) => {
    const employee = employees?.find(e => e.id === salary.employeeId);
    const settings = salary.enterprise === 'Vithal' ? vithalSettings : rvSettings;

    if (!employee || !settings) {
      toast({ variant: 'destructive', title: 'Error', description: 'Employee or Company settings missing.' });
      return;
    }

    try {
      await generateSalaryPdfSlip(salary, employee, settings);
      toast({ title: 'Success', description: 'PDF Salary slip generated.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Banknote className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Payroll Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage employee monthly salaries and generate slips.</p>
          </div>
          <Button onClick={() => handleOpenForm(null)} className="shadow-lg shadow-primary/20 h-10 group">
            <PlusCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
            Add Salary Record
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Enterprise)} className="w-full">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 h-10">
                  <TabsTrigger value="Vithal" className="text-xs">Vithal Enterprises</TabsTrigger>
                  <TabsTrigger value="RV" className="text-xs">R.V Enterprises</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 flex-1 md:max-w-md">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search employee..."
                      className="pl-9 h-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Input
                    type="month"
                    className="w-[160px] h-10"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setMonthFilter('All'); }} className="h-10 w-10">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingSalaries ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10">Loading payroll data...</TableCell></TableRow>
                    ) : filteredSalaries.length > 0 ? (
                      filteredSalaries.map(salary => {
                        const employee = employees?.find(e => e.id === salary.employeeId);
                        return (
                          <TableRow key={salary.id} className="group hover:bg-muted/30">
                            <TableCell className="pl-6 py-4">
                              <div className="font-bold text-sm">{employee?.fullName || 'Unknown'}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{employee?.specialization || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{format(parseISO(`${salary.month}-01`), 'MMMM yyyy')}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              {salary.netSalary.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={salary.status === 'Paid' ? 'outline' : 'destructive'} className={cn("text-[10px]", salary.status === 'Paid' && "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-900/20")}>
                                {salary.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 space-x-1">
                              <Button variant="ghost" title="Download PDF" size="icon" onClick={() => handleDownloadPdfSlip(salary)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenForm(salary)} className="h-8 w-8 text-amber-500 hover:bg-amber-500/10">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setSalaryToDelete(salary)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">No records found matching filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden p-4 space-y-3">
                {filteredSalaries.length > 0 ? (
                  filteredSalaries.map(salary => {
                    const employee = employees?.find(e => e.id === salary.employeeId);
                    return (
                      <div key={salary.id} className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm">{employee?.fullName || 'Unknown'}</div>
                            <div className="text-[10px] text-muted-foreground">{format(parseISO(`${salary.month}-01`), 'MMMM yyyy')}</div>
                          </div>
                          <Badge variant={salary.status === 'Paid' ? 'outline' : 'destructive'} className={cn("text-[10px]", salary.status === 'Paid' && "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-900/20")}>
                            {salary.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <div className="text-sm font-black text-primary">
                            {salary.netSalary.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadPdfSlip(salary)} className="h-8 px-2 text-[10px] text-red-600 border-red-200 hover:bg-red-500/10 hover:text-red-700">
                              <FileText className="mr-1 h-3 w-3" /> PDF
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleOpenForm(salary)} className="h-8 w-8 text-amber-500 hover:bg-amber-500/10">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setSalaryToDelete(salary)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm">No records found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </Tabs>

        {/* Add/Edit Salary Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-black">{editingSalary ? 'Modify Salary Record' : 'Record Monthly Salary'}</DialogTitle>
              <DialogDescription className="text-xs">Setting up detailed payroll for {activeTab} Enterprises.</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId} disabled={isLoadingEmployees}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choose technician..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary Month</Label>
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-10" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Earnings Column */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-green-600 flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Earnings
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Basic Salary</Label>
                      <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">D.A.</Label>
                      <Input type="number" value={da} onChange={(e) => setDa(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">H.R.A.</Label>
                      <Input type="number" value={hra} onChange={(e) => setHra(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">O.T.</Label>
                      <Input type="number" value={ot} onChange={(e) => setOt(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 items-center gap-4 font-bold">
                      <Label className="text-xs">Gross Earnings</Label>
                      <div className="text-right text-sm">{calculations.grossEarnings.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-red-600 flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Deductions
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">P.F.</Label>
                      <Input type="number" value={pf} onChange={(e) => setPf(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">E.S.I.C.</Label>
                      <Input type="number" value={esic} onChange={(e) => setEsic(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">P.T. (Prof. Tax)</Label>
                      <Input type="number" value={pt} onChange={(e) => setPt(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">L.W.F.</Label>
                      <Input type="number" value={lwf} onChange={(e) => setLwf(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Advance</Label>
                      <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} className="h-8 font-mono text-destructive" />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 items-center gap-4 font-bold">
                      <Label className="text-xs">Gross Deductions</Label>
                      <div className="text-right text-sm text-destructive">{calculations.grossDeductions.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Net Payable Salary</p>
                  <p className="text-2xl font-black text-primary">{calculations.netPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                </div>
                <WalletCards className="h-10 w-10 text-primary opacity-20" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Date</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment mode, ref no., etc." />
              </div>
            </div>
            <DialogFooter className="p-6 border-t bg-muted/10 gap-3">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleFormSubmit} className="rounded-xl font-bold px-8">{editingSalary ? 'Update Record' : 'Save Salary'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!salaryToDelete} onOpenChange={(o) => !o && setSalaryToDelete(null)}>
          <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
            <AlertDialogHeader>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl font-black">Delete Payroll Record?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                This will permanently erase the salary record for this employee. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="h-11 rounded-xl font-bold border-muted">Keep Record</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSalary} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">Yes, Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
