'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where } from 'firebase/firestore';
import { Employee, Attendance, AttendanceStatus } from '@/lib/data';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { CalendarDays, CheckCircle2, XCircle, Clock, Coffee, Save, UserCheck, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSubmitting] = useState(false);

  // Navigation handlers
  const handlePrevDay = () => {
    setSelectedDate(prev => format(subDays(parseISO(prev), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => format(addDays(parseISO(prev), 1), 'yyyy-MM-dd'));
  };

  // Queries
  const employeesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'employees'), orderBy('fullName')) : null, 
    [firestore, user]
  );

  const attendanceQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'attendance'), where('date', '==', selectedDate)) : null, 
    [firestore, user, selectedDate]
  );

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
  const { data: dailyAttendance, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    dailyAttendance?.forEach(a => map.set(a.employeeId, a.status));
    return map;
  }, [dailyAttendance]);

  const handleStatusChange = async (empId: string, status: AttendanceStatus) => {
    if (!firestore) return;
    
    const docId = `${selectedDate}_${empId}`;
    const attendanceRef = doc(firestore, 'attendance', docId);
    
    const data: Omit<Attendance, 'id'> = {
      employeeId: empId,
      date: selectedDate,
      status,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(attendanceRef, data, { merge: true });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save attendance.' });
    }
  };

  const markAllPresent = async () => {
    if (!firestore || !employees) return;
    setIsSubmitting(true);
    
    const promises = employees.map(emp => {
      const docId = `${selectedDate}_${emp.id}`;
      return setDoc(doc(firestore, 'attendance', docId), {
        employeeId: emp.id,
        date: selectedDate,
        status: 'Present' as AttendanceStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    try {
      await Promise.all(promises);
      toast({ title: 'Success', description: `All employees marked Present for ${format(parseISO(selectedDate), 'PP')}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Bulk Error', description: 'Failed to mark all present.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    if (!employees) return { total: 0, present: 0, absent: 0, half: 0 };
    const counts = { total: employees.length, present: 0, absent: 0, half: 0 };
    employees.forEach(e => {
      const s = attendanceMap.get(e.id);
      if (s === 'Present') counts.present++;
      else if (s === 'Absent') counts.absent++;
      else if (s === 'Half-Day') counts.half++;
    });
    return counts;
  }, [employees, attendanceMap]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="h-7 w-7 text-primary" />
              Daily Attendance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage and track haazri for all technicians.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
                <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative group mx-1">
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent h-8 border-none text-xs sm:text-sm font-bold focus:ring-0 outline-none w-28 sm:w-32 cursor-pointer text-center"
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
             </div>
             <Button 
                onClick={markAllPresent} 
                disabled={isSaving || isLoadingEmployees} 
                size="sm"
                className="shadow-lg shadow-primary/20 h-9 px-4 text-xs font-bold"
              >
                Mark All Present
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Present</p>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.present}</div>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-1">Absent</p>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{stats.absent}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Half Day</p>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.half}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Total Team</p>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg">Staff List - {format(parseISO(selectedDate), 'PPPP')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoadingEmployees ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : employees && employees.length > 0 ? (
                employees.map((emp) => {
                  const status = attendanceMap.get(emp.id);
                  return (
                    <div key={emp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                          {emp.fullName[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base">{emp.fullName}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">
                            {emp.specialization || 'Workshop Staff'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <StatusButton 
                          active={status === 'Present'} 
                          type="Present" 
                          onClick={() => handleStatusChange(emp.id, 'Present')} 
                        />
                        <StatusButton 
                          active={status === 'Absent'} 
                          type="Absent" 
                          onClick={() => handleStatusChange(emp.id, 'Absent')} 
                        />
                        <StatusButton 
                          active={status === 'Half-Day'} 
                          type="Half-Day" 
                          onClick={() => handleStatusChange(emp.id, 'Half-Day')} 
                        />
                        <StatusButton 
                          active={status === 'Holiday'} 
                          type="Holiday" 
                          onClick={() => handleStatusChange(emp.id, 'Holiday')} 
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-20 text-center text-muted-foreground">
                  No active employees found. Please add employees first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

const StatusButton = ({ active, type, onClick }: { active: boolean, type: AttendanceStatus, onClick: () => void }) => {
  const configs = {
    Present: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
    Absent: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800' },
    'Half-Day': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
    Holiday: { icon: Coffee, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all active:scale-95",
        active 
          ? `${config.bg} ${config.color} ${config.border} shadow-sm ring-2 ring-offset-1 ring-primary/20` 
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", active ? config.color : "text-muted-foreground/50")} />
      {type === 'Half-Day' ? 'Half' : type}
    </button>
  );
};
