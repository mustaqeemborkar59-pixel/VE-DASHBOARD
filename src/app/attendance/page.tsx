'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, deleteDoc } from 'firebase/firestore';
import { Employee, Attendance, AttendanceStatus } from '@/lib/data';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { UserCheck, ChevronLeft, ChevronRight, Info, MousePointer2, Eraser, Clock, User, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

type ActiveTool = AttendanceStatus | 'Clear' | 'OT' | null;

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  
  const [cellCycleIndices, setCellCycleIndices] = useState<Record<string, number>>({});

  const [isOTDialogOpen, setIsOTDialogOpen] = useState(false);
  const [otHours, setOtHours] = useState('0');
  const [selectedOTCell, setSelectedOTCell] = useState<{ empId: string, date: Date } | null>(null);

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

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const employeesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'employees'), orderBy('createdAt', 'asc')) : null, 
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

  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, Attendance>> = {};
    attendanceRecords?.forEach(rec => {
      if (!map[rec.employeeId]) map[rec.employeeId] = {};
      map[rec.employeeId][rec.date] = rec;
    });
    return map;
  }, [attendanceRecords]);

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

  const handleStatusToggle = (empId: string, date: Date) => {
    if (!firestore) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const cellKey = `${dateStr}_${empId}`;
    const currentRecord = attendanceMap[empId]?.[dateStr];
    const currentStatus = currentRecord?.status;
    const currentOT = currentRecord?.overtimeHours || 0;
    const attendanceRef = doc(firestore, 'attendance', cellKey);
    
    let nextStatus: AttendanceStatus | null = null;

    if (activeTool) {
        if (activeTool === 'Clear') {
            deleteDoc(attendanceRef).catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: attendanceRef.path,
                    operation: 'delete',
                }));
            });
            return;
        } else if (activeTool === 'OT') {
            setSelectedOTCell({ empId, date });
            setOtHours(currentOT.toString());
            setIsOTDialogOpen(true);
            return;
        } else {
            nextStatus = currentStatus === activeTool ? null : activeTool;
        }
    } else {
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
        nextStatus = statusCycle[nextIndex];
        setCellCycleIndices(prev => ({ ...prev, [cellKey]: nextIndex }));
    }

    if (nextStatus) {
        setDoc(attendanceRef, {
            employeeId: empId,
            date: dateStr,
            status: nextStatus,
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: attendanceRef.path,
                operation: 'update',
                requestResourceData: { status: nextStatus }
            }));
        });
    } else {
        if (currentOT > 0) {
            setDoc(attendanceRef, {
                employeeId: empId,
                date: dateStr,
                status: null,
                updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: attendanceRef.path,
                    operation: 'update',
                    requestResourceData: { status: null }
                }));
            });
        } else {
            deleteDoc(attendanceRef).catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: attendanceRef.path,
                    operation: 'delete',
                }));
            });
        }
    }
  };

  const handleSaveOT = () => {
    if (!firestore || !selectedOTCell) return;
    
    const { empId, date } = selectedOTCell;
    const dateStr = format(date, 'yyyy-MM-dd');
    const cellKey = `${dateStr}_${empId}`;
    const attendanceRef = doc(firestore, 'attendance', cellKey);
    const hours = parseFloat(otHours) || 0;

    const currentStatus = attendanceMap[empId]?.[dateStr]?.status || null;
    
    const data: any = {
        employeeId: empId,
        date: dateStr,
        overtimeHours: hours,
        updatedAt: new Date().toISOString()
    };

    if (currentStatus) {
        data.status = currentStatus;
    }
    
    setDoc(attendanceRef, data, { merge: true }).catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: attendanceRef.path,
            operation: 'update',
            requestResourceData: data
        }));
    });
    
    setIsOTDialogOpen(false);
    toast({ title: 'Overtime Saved', description: `${hours} hours recorded.` });
  }

  const getStatusIcon = (record: Attendance | undefined, isSun: boolean) => {
    if (!record) return null;
    const status = record.status;
    const ot = record.overtimeHours;

    if (ot && ot > 0 && !status) {
        return (
            <div className="flex flex-col items-center leading-none">
                <span className="font-black text-orange-600 text-[10px]">OT</span>
                <span className="text-[7px] font-black text-orange-500 uppercase">{ot}H</span>
            </div>
        );
    }

    if (ot && ot > 0) {
        let baseChar = '';
        if (status === 'Present') baseChar = 'P';
        else if (status === 'Half-Day') baseChar = 'H';
        else if (status === 'Holiday') baseChar = 'O';
        else if (status === 'Absent') baseChar = 'A';

        return (
            <div className="flex flex-col items-center leading-none">
                <div className="flex items-center gap-0.5">
                    {baseChar && <span className={cn("text-[8px] font-black uppercase", isSun ? "text-rose-600" : "opacity-40")}>{baseChar}</span>}
                    <span className="font-black text-orange-600 text-[8px]">OT</span>
                </div>
                <span className="text-[7px] font-black text-orange-500 uppercase">{ot}H</span>
            </div>
        );
    }

    switch (status) {
      case 'Present': return <span className={cn("font-black text-[11px]", isSun ? "text-rose-600" : "text-emerald-600")}>P</span>;
      case 'Absent': return <span className="text-rose-600 font-black text-[11px]">A</span>;
      case 'Half-Day': return <span className="text-amber-600 font-black text-[11px]">H</span>;
      case 'Holiday': return <span className="text-blue-600 font-black text-[11px]">O</span>;
      default: return null;
    }
  };

  const getStatusBg = (status: AttendanceStatus | undefined, isCurrentDay: boolean, ot?: number, isSun?: boolean) => {
    const base = isCurrentDay ? "ring-1 ring-inset ring-primary/40" : "";
    
    if (ot && ot > 0 && !status) {
        return cn(base, "bg-orange-50/80 dark:bg-orange-900/20");
    }

    if (isSun && !status && !ot) {
        return cn(base, "bg-rose-50/50 dark:bg-rose-950/10");
    }

    switch (status) {
      case 'Present': return cn(base, "bg-emerald-100/80 dark:bg-emerald-900/40");
      case 'Absent': return cn(base, "bg-rose-100/80 dark:bg-rose-900/40");
      case 'Half-Day': return cn(base, "bg-amber-100/80 dark:bg-amber-900/40");
      case 'Holiday': return cn(base, "bg-blue-100/80 dark:bg-blue-900/40");
      default: return isSun ? cn(base, "bg-rose-50/50") : "";
    }
  };

  const getTechnicianSummary = (empId: string) => {
    const records = attendanceMap[empId] || {};
    let present = 0;
    let absent = 0;
    let half = 0;
    let otTotal = 0;

    Object.values(records).forEach(rec => {
        if (rec.status === 'Present') present++;
        else if (rec.status === 'Absent') absent++;
        else if (rec.status === 'Half-Day') half++;
        if (rec.overtimeHours) otTotal += rec.overtimeHours;
    });

    return { present, absent, half, otTotal };
  };

  return (
    <AppLayout>
      <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-4 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 pt-2">
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2 text-foreground">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Haazri Register
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Attendance Log</p>
          </div>
          
          <div className="flex items-center justify-center bg-card border rounded-xl p-1 shadow-sm self-center sm:self-auto">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent h-9 border-none text-sm font-black focus:ring-0 outline-none w-32 text-center cursor-pointer uppercase tracking-tighter"
            />
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-9 w-9">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tools Toolbar */}
        <div className="sticky top-[60px] z-50 px-4 py-2 bg-background/80 backdrop-blur-md">
            <div className="bg-card border rounded-2xl p-2 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-1.5 px-2 border-r pr-3">
                    <MousePointer2 className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden xs:inline">Mode:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar px-2">
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Present' ? null : 'Present')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'Present' ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-600/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                    >P</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Absent' ? null : 'Absent')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'Absent' ? "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-600/20" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                    >A</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Half-Day' ? null : 'Half-Day')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'Half-Day' ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600/20" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                    >H</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Holiday' ? null : 'Holiday')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'Holiday' ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                    >O</button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <button 
                        onClick={() => setActiveTool(activeTool === 'OT' ? null : 'OT')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'OT' ? "bg-orange-600 text-white border-orange-600 ring-2 ring-orange-600/20" : "bg-orange-50 text-orange-700 border-orange-200"
                        )}
                    >OT</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Clear' ? null : 'Clear')}
                        className={cn(
                            "w-9 h-9 rounded-xl text-xs font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm shrink-0",
                            activeTool === 'Clear' ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-zinc-500 border-zinc-200"
                        )}
                    ><Eraser className="h-4 w-4" /></button>
                </div>
            </div>
        </div>

        {/* Tablet & Desktop View (Traditional Table) */}
        <div className="hidden md:block px-4">
            <Card className="rounded-2xl overflow-hidden shadow-sm border-border/50">
                <CardHeader className="p-4 border-b bg-muted/20">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full border-collapse table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-muted/40">
                                <th className="sticky left-0 z-40 bg-muted/95 backdrop-blur-md p-4 text-left text-[10px] font-black uppercase tracking-widest border-b border-r w-[180px] shadow-sm">
                                    Technician Name
                                </th>
                                {daysInMonth.map(day => {
                                    const isSun = day.getDay() === 0;
                                    return (
                                        <th 
                                            key={day.toISOString()} 
                                            className={cn(
                                                "p-2 text-center border-b border-r",
                                                isToday(day) ? "bg-primary/10" : (isSun ? "bg-rose-100/50" : "")
                                            )}
                                        >
                                            <div className="flex flex-col leading-none gap-1">
                                                <span className={cn("text-[11px] font-bold", isSun ? "text-rose-600" : "")}>{format(day, 'dd')}</span>
                                                <span className={cn("text-[8px] font-black tracking-tighter uppercase", isSun ? "text-rose-600" : "opacity-50")}>
                                                    {format(day, 'EEE')}
                                                </span>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingEmployees ? (
                                <tr><td colSpan={daysInMonth.length + 1} className="p-20 text-center animate-pulse text-xs font-black uppercase text-muted-foreground tracking-widest">Synchronizing records...</td></tr>
                            ) : (
                                employees?.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-muted/5 h-12">
                                        <td className="sticky left-0 z-30 bg-card/95 backdrop-blur-md p-4 border-b border-r font-bold text-xs truncate shadow-sm">
                                            {emp.fullName}
                                        </td>
                                        {daysInMonth.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const record = attendanceMap[emp.id]?.[dateStr];
                                            const status = record?.status;
                                            const isSun = day.getDay() === 0;
                                            const ot = record?.overtimeHours || 0;
                                            
                                            return (
                                                <td 
                                                    key={dateStr}
                                                    onClick={() => handleStatusToggle(emp.id, day)}
                                                    className={cn(
                                                        "p-0 text-center border-b border-r cursor-pointer transition-all active:bg-primary/10 select-none",
                                                        getStatusBg(status, isToday(day), ot, isSun)
                                                    )}
                                                >
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        {ot > 0 ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="h-full w-full flex items-center justify-center">
                                                                        {getStatusIcon(record, isSun)}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="py-1.5 px-3 text-[10px] font-black bg-zinc-900 text-white border-none shadow-xl rounded-lg">
                                                                    {status ? `${status} + ` : ''}{ot} Hrs Overtime
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            getStatusIcon(record, isSun)
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>

        {/* Mobile View (Vertical Cards) */}
        <div className="md:hidden flex flex-col gap-4 px-4 pb-20">
            {isLoadingEmployees ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />
                ))
            ) : (
                employees?.map((emp) => {
                    const summary = getTechnicianSummary(emp.id);
                    return (
                        <Card key={emp.id} className="rounded-3xl overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
                            <CardHeader className="p-5 pb-3 border-b bg-muted/10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black tracking-tight">{emp.fullName}</CardTitle>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.specialization || 'Technician'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                                            {summary.otTotal}H OT
                                        </Badge>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase flex gap-2">
                                            <span>P:{summary.present}</span>
                                            <span>A:{summary.absent}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-5">
                                <div className="grid grid-cols-7 gap-2">
                                    {['S','M','T','W','T','F','S'].map((day, i) => (
                                        <div key={i} className={cn("text-center text-[8px] font-black uppercase opacity-40", i === 0 ? "text-rose-600 opacity-100" : "")}>
                                            {day}
                                        </div>
                                    ))}
                                    
                                    {Array.from({ length: getDay(daysInMonth[0]) }).map((_, i) => (
                                        <div key={`pad-${i}`} className="h-10 w-full" />
                                    ))}

                                    {daysInMonth.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const record = attendanceMap[emp.id]?.[dateStr];
                                        const status = record?.status;
                                        const ot = record?.overtimeHours || 0;
                                        const isSun = day.getDay() === 0;

                                        return (
                                            <div 
                                                key={dateStr}
                                                onClick={() => handleStatusToggle(emp.id, day)}
                                                className={cn(
                                                    "h-10 w-full rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-90 cursor-pointer border border-transparent shadow-sm",
                                                    isSun ? "bg-rose-50 border-rose-100" : "bg-muted/30 border-muted-foreground/5",
                                                    isToday(day) ? "ring-2 ring-primary ring-offset-1 z-10" : "",
                                                    getStatusBg(status, false, ot, isSun)
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-[9px] font-black mb-0.5", 
                                                    isSun ? "text-rose-600" : "text-muted-foreground/60",
                                                    (status || ot > 0) && "opacity-40"
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                <div className="scale-90 origin-center">
                                                    {getStatusIcon(record, isSun)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>

        {/* Footer Info */}
        <div className="px-4 pb-10">
            <Card className="bg-muted/20 border-dashed rounded-3xl">
                <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Instructions</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                            Sundays are highlighted in <b>Rose</b>. 
                            Use the <b>OT tool</b> to record extra hours (even without a base status).
                            Working on any day is marked as <b>P</b>.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      </TooltipProvider>

      {/* OT Dialog */}
      <Dialog open={isOTDialogOpen} onOpenChange={setIsOTDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[340px] p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-orange-50 border-b border-orange-100">
                <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-orange-700">
                    <Clock className="h-5 w-5" /> Record Overtime
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-orange-600/70">
                    {selectedOTCell && format(selectedOTCell.date, 'EEEE, dd MMM yyyy')}
                </DialogDescription>
            </DialogHeader>
            <div className="p-8">
                <Label htmlFor="ot-hours" className="text-[10px] font-black uppercase mb-4 block text-muted-foreground tracking-widest text-center">Hours Worked</Label>
                <div className="flex items-center justify-center gap-4">
                    <Input 
                        id="ot-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={otHours}
                        onChange={(e) => setOtHours(e.target.value)}
                        className="h-14 w-24 text-center font-black text-2xl bg-muted/30 border-2 rounded-2xl focus-visible:ring-orange-500"
                        autoFocus
                    />
                    <span className="font-black text-xs text-muted-foreground uppercase tracking-widest">Hrs</span>
                </div>
            </div>
            <DialogFooter className="p-5 bg-muted/10 grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => setIsOTDialogOpen(false)} className="h-12 rounded-2xl text-[11px] font-black uppercase">Cancel</Button>
                <Button onClick={handleSaveOT} className="h-12 rounded-2xl text-[11px] font-black uppercase bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20">Save Hours</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
