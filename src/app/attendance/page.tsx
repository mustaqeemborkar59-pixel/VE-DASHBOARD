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

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  // Track the current cycle index for each cell to allow P -> Clear -> A -> Clear... flow
  const [cellCycleIndices, setCellCycleIndices] = useState<Record<string, number>>({});

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

  // Toggle Sequence: null (0), Present (1), null (2), Absent (3), null (4), Half-Day (5), null (6), Holiday/Off (7)
  const statusCycle: (AttendanceStatus | null)[] = [
    null, 
    'Present', 
    null, 
    'Absent', 
    null, 
    'Half-Day', 
    null, 
    'Holiday'
  ];

  const handleStatusToggle = async (empId: string, date: Date) => {
    if (!firestore) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const cellKey = `${dateStr}_${empId}`;
    const currentStatus = attendanceMap[empId]?.[dateStr];
    
    // Determine the starting index based on current status if not tracked in this session
    let currentIndex = cellCycleIndices[cellKey];
    if (currentIndex === undefined) {
        if (!currentStatus) currentIndex = 0;
        else if (currentStatus === 'Present') currentIndex = 1;
        else if (currentStatus === 'Absent') currentIndex = 3;
        else if (currentStatus === 'Half-Day') currentIndex = 5;
        else if (currentStatus === 'Holiday') currentIndex = 7;
        else currentIndex = 0;
    }

    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];
    
    // Update session tracker
    setCellCycleIndices(prev => ({ ...prev, [cellKey]: nextIndex }));

    const attendanceRef = doc(firestore, 'attendance', cellKey);

    try {
      if (nextStatus) {
        await setDoc(attendanceRef, {
          employeeId: empId,
          date: dateStr,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
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
      default: return null;
    }
  };

  const getStatusBg = (status: AttendanceStatus | undefined, isCurrentDay: boolean) => {
    const base = isCurrentDay ? "ring-1 ring-inset ring-primary/40" : "";
    switch (status) {
      case 'Present': return cn(base, "bg-emerald-100/80 dark:bg-emerald-900/40");
      case 'Absent': return cn(base, "bg-rose-100/80 dark:bg-rose-900/40");
      case 'Half-Day': return cn(base, "bg-amber-100/80 dark:bg-amber-900/40");
      case 'Holiday': return cn(base, "bg-blue-100/80 dark:bg-blue-900/40");
      default: return "";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 animate-in fade-in duration-500 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 pt-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Workshop Haazri Register
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Monthly master sheet for employee attendance.</p>
          </div>
          
          <div className="flex items-center bg-card border rounded-lg p-0.5 shadow-sm self-start sm:self-auto">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent h-7 border-none text-[10px] sm:text-xs font-black focus:ring-0 outline-none w-24 text-center cursor-pointer uppercase tracking-tighter"
            />
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm rounded-none">
          <CardHeader className="p-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                </CardTitle>
                <div className="hidden sm:flex items-center gap-3 text-[9px] font-bold uppercase">
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> P</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> A</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> H</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> O</div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto hide-scrollbar">
            <table className="w-full border-collapse table-fixed min-w-[800px] sm:min-w-full">
              <thead>
                <tr className="bg-muted/40">
                  <th className="sticky left-0 z-20 bg-muted/80 backdrop-blur-md p-2 text-left text-[9px] font-black uppercase tracking-wider border-b border-r w-[140px]">
                    Technician
                  </th>
                  {daysInMonth.map(day => (
                    <th 
                      key={day.toISOString()} 
                      className={cn(
                        "p-1 text-center text-[8px] font-bold border-b border-r",
                        isToday(day) 
                          ? "bg-primary/20 text-primary" 
                          : (day.getDay() === 0 ? "bg-blue-600/20 text-blue-700 dark:text-blue-400" : "text-muted-foreground")
                      )}
                    >
                      <div className="flex flex-col leading-none">
                        <span>{format(day, 'dd')}</span>
                        <span className="text-[7px] opacity-50 font-medium">{format(day, 'EEE')[0]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-1 text-center text-[9px] font-black uppercase tracking-wider bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 border-b w-[35px]">
                    P
                  </th>
                  <th className="p-1 text-center text-[9px] font-black uppercase tracking-wider bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 border-b w-[35px]">
                    A
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingEmployees ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={daysInMonth.length + 3} className="p-4 text-center animate-pulse text-[10px]">Syncing Register...</td></tr>
                  ))
                ) : employees && employees.length > 0 ? (
                  employees.map((emp) => {
                    let presentCount = 0;
                    let absentCount = 0;

                    return (
                      <tr key={emp.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/10 backdrop-blur-md p-2 border-b border-r font-bold text-[10px] truncate leading-tight">
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
                                "p-0 text-center border-b border-r cursor-pointer transition-all active:scale-95 h-9",
                                day.getDay() === 0 ? "bg-blue-600/10 dark:bg-blue-900/30" : "",
                                getStatusBg(status, isToday(day))
                              )}
                            >
                              <div className="h-full flex items-center justify-center text-[10px]">
                                {getStatusIcon(status)}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-1 text-center text-[10px] font-black bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 border-b">
                          {presentCount}
                        </td>
                        <td className="p-1 text-center text-[10px] font-black bg-rose-50/30 dark:bg-rose-950/10 text-rose-700 border-b">
                          {absentCount}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={daysInMonth.length + 3} className="p-10 text-center text-muted-foreground text-xs">No technicians found in database.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 pb-4">
            <Card className="bg-muted/20 border-dashed border-muted-foreground/20">
                <CardContent className="p-3 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-tight">One-Click Toggle Cycle</p>
                        <p className="text-[9px] text-muted-foreground leading-relaxed">
                            Click to cycle: <b>P (Present)</b> → <b>Clear</b> → <b>A (Absent)</b> → <b>Clear</b> → <b>H (Half)</b> → <b>Clear</b> → <b>O (Off)</b> → <b>Clear</b>.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-around p-2 border rounded-lg bg-card shadow-sm gap-2">
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-600">P</div>
                    <span className="text-muted-foreground/80 uppercase">Full</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-600">A</div>
                    <span className="text-muted-foreground/80 uppercase">Absent</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-600">H</div>
                    <span className="text-muted-foreground/80 uppercase">0.5 Day</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-blue-500/30 bg-blue-500/10 flex items-center justify-center text-blue-600">O</div>
                    <span className="text-muted-foreground/80 uppercase">Off</span>
                </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
