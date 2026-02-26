'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, deleteDoc } from 'firebase/firestore';
import { Employee, Attendance, AttendanceStatus } from '@/lib/data';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { UserCheck, ChevronLeft, ChevronRight, Info, MousePointer2, Eraser, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    toast({ title: 'Overtime Saved', description: `${hours} hours recorded for technician.` });
  }

  const getStatusIcon = (record: Attendance | undefined, isSun: boolean) => {
    if (!record) return null;
    const status = record.status;
    const ot = record.overtimeHours;

    if (ot && ot > 0 && !status) {
        return (
            <div className="flex flex-col items-center leading-none gap-0.5">
                <span className="font-black text-orange-600 text-[9px] sm:text-[10px]">OT</span>
                <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter">{ot}H</span>
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
            <div className="flex flex-col items-center leading-none gap-0.5">
                <div className="flex items-center gap-0.5">
                    {baseChar && <span className={cn("text-[8px] font-black opacity-40 uppercase", isSun && status === 'Present' ? "text-rose-600 opacity-100" : "")}>{baseChar}</span>}
                    <span className="font-black text-orange-600 text-[8px] sm:text-[9px]">OT</span>
                </div>
                <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter">{ot}H</span>
            </div>
        );
    }

    switch (status) {
      case 'Present': return <span className={cn("font-black text-[10px] sm:text-[11px]", isSun ? "text-rose-600" : "text-emerald-600")}>P</span>;
      case 'Absent': return <span className="text-rose-600 font-black text-[10px] sm:text-[11px]">A</span>;
      case 'Half-Day': return <span className="text-amber-600 font-black text-[10px] sm:text-[11px]">H</span>;
      case 'Holiday': return <span className="text-blue-600 font-black text-[10px] sm:text-[11px]">O</span>;
      default: return null;
    }
  };

  const getStatusBg = (status: AttendanceStatus | undefined, isCurrentDay: boolean, ot?: number) => {
    const base = isCurrentDay ? "ring-1 ring-inset ring-primary/40" : "";
    
    if (ot && ot > 0 && !status) {
        return cn(base, "bg-orange-50/80 dark:bg-orange-900/20");
    }

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
      <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-4 animate-in fade-in duration-500 max-w-full overflow-hidden">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 pt-2">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Haazri Register
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Attendance Grid</p>
          </div>
          
          <div className="flex items-center bg-card border rounded-lg p-0.5 shadow-sm self-start sm:self-auto">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent h-8 border-none text-[11px] sm:text-xs font-black focus:ring-0 outline-none w-28 text-center cursor-pointer uppercase tracking-tighter"
            />
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Improved Tool Selector for Mobile */}
        <div className="px-4 flex flex-col gap-2">
            <div className="bg-card border rounded-xl p-2 flex flex-wrap items-center gap-2 shadow-sm">
                <div className="flex items-center gap-1.5 px-1 border-r pr-2 mr-1">
                    <MousePointer2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden xs:inline">Tool:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Present' ? null : 'Present')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'Present' ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                    >P</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Absent' ? null : 'Absent')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'Absent' ? "bg-rose-600 text-white border-rose-600" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                    >A</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Half-Day' ? null : 'Half-Day')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'Half-Day' ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                    >H</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Holiday' ? null : 'Holiday')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'Holiday' ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                    >O</button>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <button 
                        onClick={() => setActiveTool(activeTool === 'OT' ? null : 'OT')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'OT' ? "bg-orange-600 text-white border-orange-600" : "bg-orange-50 text-orange-700 border-orange-200"
                        )}
                    >OT</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Clear' ? null : 'Clear')}
                        className={cn(
                            "w-8 h-8 rounded-lg text-[11px] font-black border transition-all active:scale-90 flex items-center justify-center shadow-sm",
                            activeTool === 'Clear' ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-zinc-500 border-zinc-200"
                        )}
                    ><Eraser className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            {activeTool && (
                <div className="animate-in slide-in-from-left-2 duration-300">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black border bg-primary/5 text-primary border-primary/20 uppercase tracking-widest flex items-center w-fit gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Mode: {activeTool === 'Clear' ? 'Eraser' : (activeTool === 'OT' ? 'Overtime' : activeTool)} Active
                    </span>
                </div>
            )}
        </div>

        {/* Table Container with Horizontal Scroll */}
        <div className="px-0 sm:px-4">
            <Card className="border-y sm:border rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm">
                <CardHeader className="p-3 border-b bg-muted/20 hidden sm:flex">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto hide-scrollbar touch-pan-x">
                    <table className="w-full border-collapse table-fixed min-w-[900px]">
                        <thead>
                            <tr className="bg-muted/40">
                                <th className="sticky left-0 z-40 bg-muted/95 backdrop-blur-md p-3 text-left text-[10px] font-black uppercase tracking-widest border-b border-r w-[120px] sm:w-[160px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Technician
                                </th>
                                {daysInMonth.map(day => {
                                    const isSun = day.getDay() === 0;
                                    return (
                                        <th 
                                            key={day.toISOString()} 
                                            className={cn(
                                                "p-1 text-center border-b border-r",
                                                isToday(day) ? "bg-primary/10" : (isSun ? "bg-rose-50" : "")
                                            )}
                                        >
                                            <div className="flex flex-col leading-none gap-0.5">
                                                <span className={cn("text-[10px] font-bold", isSun ? "text-rose-600" : "")}>{format(day, 'dd')}</span>
                                                <span className={cn("text-[8px] font-black tracking-tighter uppercase", isSun ? "text-rose-600" : "opacity-50")}>
                                                    {format(day, 'EEE').charAt(0)}
                                                </span>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingEmployees ? (
                                <tr><td colSpan={daysInMonth.length + 1} className="p-10 text-center animate-pulse text-[10px] font-black uppercase text-muted-foreground">Syncing...</td></tr>
                            ) : (
                                employees?.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-muted/5 h-10">
                                        <td className="sticky left-0 z-30 bg-card/95 backdrop-blur-md p-3 border-b border-r font-black text-[10px] sm:text-[11px] truncate shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
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
                                                        "p-0 text-center border-b border-r cursor-pointer transition-all active:bg-primary/5 select-none",
                                                        isSun ? "bg-rose-50/50" : "",
                                                        getStatusBg(status, isToday(day), ot)
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
                                                                <TooltipContent side="top" className="py-1 px-2 text-[10px] font-black bg-orange-600 text-white border-none shadow-lg">
                                                                    {status ? `${status} + ` : ''}{ot} Hrs OT
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

        {/* Info Box */}
        <div className="px-4 pb-10">
            <Card className="bg-muted/20 border-dashed rounded-xl">
                <CardContent className="p-4 flex items-start gap-3">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest">Guide</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
                            Sundays are Rose-colored. Use <b>P</b> for Presence or <b>OT</b> for overtime. 
                            Hover on OT cells to see hours. <b>Eraser</b> clears everything.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      </TooltipProvider>

      {/* OT Dialog */}
      <Dialog open={isOTDialogOpen} onOpenChange={setIsOTDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[320px] p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-orange-50 border-b border-orange-100">
                <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-orange-700">
                    <Clock className="h-5 w-5" /> Record OT
                </DialogTitle>
                <DialogDescription className="text-[11px] font-medium text-orange-600/70">
                    {selectedOTCell && format(selectedOTCell.date, 'dd MMM yyyy')}
                </DialogDescription>
            </DialogHeader>
            <div className="p-6">
                <Label htmlFor="ot-hours" className="text-[10px] font-black uppercase mb-3 block text-muted-foreground tracking-widest text-center">Hours worked</Label>
                <div className="flex items-center justify-center gap-3">
                    <Input 
                        id="ot-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={otHours}
                        onChange={(e) => setOtHours(e.target.value)}
                        className="h-12 w-20 text-center font-black text-xl bg-muted/30 border-2"
                        autoFocus
                    />
                    <span className="font-black text-xs text-muted-foreground uppercase">Hrs</span>
                </div>
            </div>
            <DialogFooter className="p-4 bg-muted/10 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsOTDialogOpen(false)} className="h-10 rounded-xl text-[11px] font-black uppercase">Cancel</Button>
                <Button onClick={handleSaveOT} className="h-10 rounded-xl text-[11px] font-black uppercase bg-orange-600 hover:bg-orange-700">Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
