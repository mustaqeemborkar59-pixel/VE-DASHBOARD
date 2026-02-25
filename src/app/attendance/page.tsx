
'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, deleteDoc } from 'firebase/firestore';
import { Employee, Attendance, AttendanceStatus } from '@/lib/data';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { UserCheck, ChevronLeft, ChevronRight, Info, MousePointer2, Eraser, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActiveTool = AttendanceStatus | 'Clear' | 'OT' | null;

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  
  // Track the current cycle index for each cell to allow P -> Clear -> A -> Clear... flow
  const [cellCycleIndices, setCellCycleIndices] = useState<Record<string, number>>({});

  // Overtime Dialog State
  const [isOTDialogOpen, setIsOTDialogOpen] = useState(false);
  const [otHours, setOtHours] = useState('0');
  const [selectedOTCell, setSelectedOTCell] = useState<{ empId: string, date: Date } | null>(null);

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

  // Queries - Matching the sort order of the Employees section (createdAt asc)
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

  // Map attendance records for quick lookup: map[empId][date] = record
  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, Attendance>> = {};
    attendanceRecords?.forEach(rec => {
      if (!map[rec.employeeId]) map[rec.employeeId] = {};
      map[rec.employeeId][rec.date] = rec;
    });
    return map;
  }, [attendanceRecords]);

  // Toggle Sequence: P (Present) -> Clear -> A (Absent) -> Clear -> H (Half) -> Clear -> O (Off) -> Clear
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
    const currentRecord = attendanceMap[empId]?.[dateStr];
    const currentStatus = currentRecord?.status;
    
    let nextStatus: AttendanceStatus | null = null;

    // FAST PAINT MODE LOGIC
    if (activeTool) {
        if (activeTool === 'Clear') {
            nextStatus = null;
        } else if (activeTool === 'OT') {
            // Open Overtime dialog
            setSelectedOTCell({ empId, date });
            setOtHours(currentRecord?.overtimeHours?.toString() || '0');
            setIsOTDialogOpen(true);
            return;
        } else {
            // If already same status, clear it (toggle behavior)
            nextStatus = currentStatus === activeTool ? null : activeTool;
        }
    } else {
        // TRADITIONAL CYCLE LOGIC
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

  const handleSaveOT = async () => {
    if (!firestore || !selectedOTCell) return;
    
    const { empId, date } = selectedOTCell;
    const dateStr = format(date, 'yyyy-MM-dd');
    const cellKey = `${dateStr}_${empId}`;
    const attendanceRef = doc(firestore, 'attendance', cellKey);
    const hours = parseFloat(otHours) || 0;

    try {
        // If marking OT, we assume they are Present if no status exists
        const currentStatus = attendanceMap[empId]?.[dateStr]?.status || 'Present';
        
        await setDoc(attendanceRef, {
            employeeId: empId,
            date: dateStr,
            status: currentStatus,
            overtimeHours: hours,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        setIsOTDialogOpen(false);
        toast({ title: 'Overtime Saved', description: `${hours} hours recorded for technician.` });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save Overtime.' });
    }
  }

  const getStatusIcon = (record: Attendance | undefined, isSun: boolean) => {
    if (!record) return null;
    const status = record.status;
    const ot = record.overtimeHours;

    let icon: React.ReactNode = null;
    switch (status) {
      case 'Present': icon = <span className={cn("font-black", isSun ? "text-rose-600" : "text-emerald-600")}>{isSun ? 'SW' : 'P'}</span>; break;
      case 'Absent': icon = <span className="text-rose-600 font-black">A</span>; break;
      case 'Half-Day': icon = <span className="text-amber-600 font-black">H</span>; break;
      case 'Holiday': icon = <span className="text-blue-600 font-black">O</span>; break;
    }

    if (ot && ot > 0) {
        return (
            <div className="flex flex-col items-center leading-none gap-0.5">
                {icon}
                <span className="text-[7px] font-black text-orange-600 uppercase tracking-tighter">+{ot}h</span>
            </div>
        );
    }

    return icon;
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
            <p className="text-[10px] sm:text-xs text-muted-foreground">Monthly master sheet for employee attendance. (Sundays = SW)</p>
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

        {/* QUICK PAINT TOOLS */}
        <div className="px-4 flex flex-wrap items-center gap-2">
            <div className="bg-card border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
                <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-1">
                    <MousePointer2 className="h-3 w-3" /> Paint Tool:
                </span>
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Present' ? null : 'Present')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'Present' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                    >P</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Absent' ? null : 'Absent')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'Absent' ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                    >A</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Half-Day' ? null : 'Half-Day')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'Half-Day' ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                    >H</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Holiday' ? null : 'Holiday')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'Holiday' ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                    >O</button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button 
                        onClick={() => setActiveTool(activeTool === 'OT' ? null : 'OT')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'OT' ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200"
                        )}
                    >OT</button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'Clear' ? null : 'Clear')}
                        className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-black border transition-all active:scale-90 flex items-center justify-center",
                            activeTool === 'Clear' ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-zinc-500 border-zinc-200"
                        )}
                    ><Eraser className="h-3 w-3" /></button>
                </div>
            </div>
            {activeTool && (
                <div className="animate-in slide-in-from-left-2 duration-300">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase py-1">
                        Tool Active: {activeTool === 'Clear' ? 'Eraser' : (activeTool === 'OT' ? 'Overtime (Hours)' : activeTool)} (Click cells to apply)
                    </Badge>
                </div>
            )}
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm rounded-none">
          <CardHeader className="p-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                </CardTitle>
                <div className="hidden sm:flex items-center gap-3 text-[9px] font-bold uppercase">
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> P (SW on Sunday)</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> A</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> H</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> O</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> OT (Hours)</div>
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
                  {daysInMonth.map(day => {
                    const isSun = day.getDay() === 0;
                    return (
                      <th 
                        key={day.toISOString()} 
                        className={cn(
                          "p-1 text-center text-[8px] font-bold border-b border-r",
                          isToday(day) 
                            ? "bg-primary/20 text-primary" 
                            : (isSun ? "bg-zinc-50/50 dark:bg-zinc-900/10" : "text-muted-foreground")
                        )}
                      >
                        <div className={cn("flex flex-col leading-none")}>
                          <span className={cn(isSun ? "text-rose-600" : "")}>{format(day, 'dd')}</span>
                          <span className={cn("text-[7px] font-black tracking-tighter uppercase", isSun ? "text-rose-600" : "opacity-70")}>
                            {isSun ? 'SW' : format(day, 'EEE')[0]}
                          </span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoadingEmployees ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={daysInMonth.length + 1} className="p-4 text-center animate-pulse text-[10px]">Syncing Register...</td></tr>
                  ))
                ) : employees && employees.length > 0 ? (
                  employees.map((emp) => {
                    return (
                      <tr key={emp.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/10 backdrop-blur-md p-2 border-b border-r font-bold text-[10px] truncate leading-tight">
                          {emp.fullName}
                        </td>
                        {daysInMonth.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const record = attendanceMap[emp.id]?.[dateStr];
                          const status = record?.status;
                          const isSun = day.getDay() === 0;
                          
                          return (
                            <td 
                              key={dateStr}
                              onClick={() => handleStatusToggle(emp.id, day)}
                              className={cn(
                                "p-0 text-center border-b border-r cursor-pointer transition-all active:scale-95 h-9",
                                isSun ? "bg-zinc-50/30 dark:bg-zinc-900/10" : "",
                                getStatusBg(status, isToday(day))
                              )}
                            >
                              <div className="h-full flex items-center justify-center text-[10px]">
                                {getStatusIcon(record, isSun)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={daysInMonth.length + 1} className="p-10 text-center text-muted-foreground text-xs">No technicians found in database.</td></tr>
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
                        <p className="text-[10px] font-black uppercase tracking-tight">Overtime & Sunday Policy</p>
                        <p className="text-[9px] text-muted-foreground leading-relaxed">
                            Sundays are working days (<b>SW</b>). Mark <b>OT</b> tool to record extra hours worked. <br/>
                            Overtime hours will be added to the current day's record.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-around p-2 border rounded-lg bg-card shadow-sm gap-2">
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[8px]">P/SW</div>
                    <span className="text-muted-foreground/80 uppercase">Working</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-600 text-[8px]">A</div>
                    <span className="text-muted-foreground/80 uppercase">Absent</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                    <div className="w-5 h-5 rounded border border-orange-500/30 bg-orange-500/10 flex items-center justify-center text-orange-600 text-[8px]">OT</div>
                    <span className="text-muted-foreground/80 uppercase">Overtime</span>
                </div>
            </div>
        </div>
      </div>

      {/* Overtime Hours Dialog */}
      <Dialog open={isOTDialogOpen} onOpenChange={setIsOTDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[300px] p-4">
            <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" /> Record Overtime
                </DialogTitle>
                <DialogDescription className="text-[10px]">
                    Enter overtime hours for {selectedOTCell && format(selectedOTCell.date, 'dd MMM yyyy')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="ot-hours" className="text-[10px] font-bold uppercase mb-1.5 block">Total OT Hours</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="ot-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={otHours}
                        onChange={(e) => setOtHours(e.target.value)}
                        className="h-10 text-center font-black text-lg"
                        autoFocus
                    />
                    <span className="font-bold text-sm text-muted-foreground">Hrs</span>
                </div>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsOTDialogOpen(false)} className="h-9 text-[10px] font-bold uppercase">Cancel</Button>
                <Button onClick={handleSaveOT} className="h-9 text-[10px] font-bold uppercase bg-orange-600 hover:bg-orange-700">Save OT</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", className)}>
        {children}
    </span>
);
