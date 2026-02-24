'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, deleteDoc } from 'firebase/firestore';
import { Employee, Attendance, AttendanceStatus } from '@/lib/data';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { UserCheck, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(format(prevDate, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setSelectedMonth(format(nextDate, 'yyyy-MM'));
  };

  // Generate days for the selected month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  // Queries
  const employeesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'employees'), orderBy('fullName')) : null, 
    [firestore, user]
  );

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const start = format(startOfMonth(parseISO(`${selectedMonth}-01`)), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(`${selectedMonth}-01`)), 'yyyy-MM-dd');
    return query(
      collection(firestore, 'attendance'), 
      where('date', '>=', start),
      where('date', '<=', end)
    );
  }, [firestore, user, selectedMonth]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

  // Map attendance records for quick lookup: map[empId][date] = status
  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, AttendanceStatus>> = {};
    attendanceRecords?.forEach(rec => {
      if (!map[rec.employeeId]) map[rec.employeeId] = {};
      map[rec.employeeId][rec.date] = rec.status;
    });
    return map;
  }, [attendanceRecords]);

  const handleStatusToggle = async (empId: string, date: Date) => {
    if (!firestore) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentStatus = attendanceMap[empId]?.[dateStr];
    
    // Cycle through statuses: null/undefined -> Present -> Absent -> Half-Day -> Holiday -> null
    const nextStatusMap: Record<string, AttendanceStatus | null> = {
      'undefined': 'Present',
      'null': 'Present',
      'Present': 'Absent',
      'Absent': 'Half-Day',
      'Half-Day': 'Holiday',
      'Holiday': null
    };
    
    const nextStatus = nextStatusMap[String(currentStatus)];
    const docId = `${dateStr}_${empId}`;
    const attendanceRef = doc(firestore, 'attendance', docId);

    try {
      if (nextStatus) {
        await setDoc(attendanceRef, {
          employeeId: empId,
          date: dateStr,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        // If next status is null, delete the document to clear the cell
        await deleteDoc(attendanceRef);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update attendance.' });
    }
  };

  const getStatusIcon = (status: AttendanceStatus | undefined) => {
    switch (status) {
      case 'Present': return <span className="text-emerald-600 font-black">P</span>;
      case 'Absent': return <span className="text-rose-600 font-black">A</span>;
      case 'Half-Day': return <span className="text-amber-600 font-black">H</span>;
      case 'Holiday': return <span className="text-blue-600 font-black">O</span>;
      default: return <span className="text-muted-foreground/20">-</span>;
    }
  };

  const getStatusBg = (status: AttendanceStatus | undefined, isCurrentDay: boolean) => {
    const base = isCurrentDay ? "ring-2 ring-inset ring-primary/30" : "";
    switch (status) {
      case 'Present': return cn(base, "bg-emerald-50 dark:bg-emerald-900/20");
      case 'Absent': return cn(base, "bg-rose-50 dark:bg-rose-900/20");
      case 'Half-Day': return cn(base, "bg-amber-50 dark:bg-amber-900/20");
      case 'Holiday': return cn(base, "bg-blue-50 dark:bg-blue-900/20");
      default: return base;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              Monthly Attendance Register
            </h1>
            <p className="text-xs text-muted-foreground">Manage workshop haazri in a single master sheet.</p>
          </div>
          
          <div className="flex items-center bg-card border rounded-xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent h-8 border-none text-xs sm:text-sm font-bold focus:ring-0 outline-none w-32 text-center cursor-pointer"
            />
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="p-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Register: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                </CardTitle>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Present</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Absent</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Half</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Off</div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/20">
                      <th className="sticky left-0 z-20 bg-muted/50 backdrop-blur-md p-3 text-left text-[10px] font-black uppercase tracking-wider border-b border-r min-w-[180px]">
                        Technician Name
                      </th>
                      {daysInMonth.map(day => (
                        <th 
                          key={day.toISOString()} 
                          className={cn(
                            "p-2 text-center text-[10px] font-bold border-b border-r min-w-[35px]",
                            isToday(day) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span>{format(day, 'dd')}</span>
                            <span className="text-[8px] font-medium opacity-60">{format(day, 'EEE')[0]}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-b">
                        P
                      </th>
                      <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 text-rose-700 border-b">
                        A
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingEmployees ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={daysInMonth.length + 3} className="p-8 text-center animate-pulse">Loading employee data...</td></tr>
                      ))
                    ) : employees && employees.length > 0 ? (
                      employees.map((emp) => {
                        let presentCount = 0;
                        let absentCount = 0;

                        return (
                          <tr key={emp.id} className="hover:bg-muted/10 transition-colors group">
                            <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/20 backdrop-blur-md p-3 border-b border-r font-bold text-xs truncate">
                              {emp.fullName}
                            </td>
                            {daysInMonth.map(day => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const status = attendanceMap[emp.id]?.[dateStr];
                              
                              if (status === 'Present') presentCount++;
                              else if (status === 'Absent') absentCount++;
                              else if (status === 'Half-Day') {
                                presentCount += 0.5;
                              }

                              return (
                                <td 
                                  key={dateStr}
                                  onClick={() => handleStatusToggle(emp.id, day)}
                                  className={cn(
                                    "p-0 text-center border-b border-r cursor-pointer transition-all active:scale-90",
                                    getStatusBg(status, isToday(day))
                                  )}
                                >
                                  <div className="h-9 flex items-center justify-center text-xs">
                                    {getStatusIcon(status)}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-3 text-center text-xs font-black bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-700 border-b">
                              {presentCount}
                            </td>
                            <td className="p-3 text-center text-xs font-black bg-rose-50/50 dark:bg-rose-950/10 text-rose-700 border-b">
                              {absentCount}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={daysInMonth.length + 3} className="p-20 text-center text-muted-foreground">No employees found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-tight">Quick Tips</p>
                        <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
                            <li>Click on any cell to cycle status: <b>P → A → H → O → None</b>.</li>
                            <li>The <b>P</b> and <b>A</b> columns at the end show the monthly summary.</li>
                            <li>A "Half-Day" (H) counts as <b>0.5</b> in the total Present count.</li>
                            <li>Data is saved instantly as you click.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
            <div className="flex flex-col justify-center p-4 space-y-2 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600">P</div>
                    <span className="text-muted-foreground">Present (Full Day)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center font-bold text-rose-600">A</div>
                    <span className="text-muted-foreground">Absent (Zero)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center font-bold text-amber-600">H</div>
                    <span className="text-muted-foreground">Half-Day (Counts 0.5)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center font-bold text-blue-600">O</div>
                    <span className="text-muted-foreground">Holiday / Off Day</span>
                </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
