'use client';
import { useState, useCallback, useMemo } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { JobCard, Company, Forklift, Employee } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { JobCardForm, JobCardFormData } from '@/components/job-card-form';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function JobCardsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobCard | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const jobCardsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'jobCards'), orderBy('creationDate', 'desc')) : null, [firestore, user]);
  const companiesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, [firestore, user]);
  const forkliftsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'forklifts'), orderBy('serialNumber', 'asc')) : null, [firestore, user]);
  const employeesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'employees'), orderBy('fullName', 'asc')) : null, [firestore, user]);
  
  const { data: jobCards, isLoading: isLoadingJobs } = useCollection<JobCard>(jobCardsQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const isLoading = isLoadingJobs || isLoadingCompanies || isLoadingForklifts || isLoadingEmployees;

  const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.name])), [companies]);
  const forkliftMap = useMemo(() => new Map(forklifts?.map(f => [f.id, `${f.serialNumber} (${f.make})`])), [forklifts]);
  const employeeMap = useMemo(() => new Map(employees?.map(e => [e.id, e.fullName])), [employees]);

  const closeAllDialogs = useCallback(() => {
    setIsFormOpen(false);
    setJobToDelete(null);
    setSelectedJob(null);
  }, []);
  
  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };
  
  const openFormDialog = useCallback((job: JobCard | null) => {
    closeAllDialogs();
    setSelectedJob(job);
    handleDelayedAction(() => setIsFormOpen(true));
  }, [closeAllDialogs]);

  const openDeleteDialog = useCallback((job: JobCard) => {
    closeAllDialogs();
    handleDelayedAction(() => setJobToDelete(job));
  }, [closeAllDialogs]);

  const handleFormSubmit = (formData: Partial<JobCardFormData>) => {
    if (!firestore) return;
    
    if (selectedJob) { // Edit mode
      const jobDocRef = doc(firestore, 'jobCards', selectedJob.id);
      updateDocumentNonBlocking(jobDocRef, formData);
      toast({ title: "Success", description: "Job Card updated successfully." });
    } else { // Add mode
      const jobsCollection = collection(firestore, 'jobCards');
      addDocumentNonBlocking(jobsCollection, {
        ...formData,
        creationDate: new Date().toISOString(),
      });
      toast({ title: "Success", description: "Job Card added successfully." });
    }
    closeAllDialogs();
  };
  
  const handleDelete = () => {
    if (!firestore || !jobToDelete) return;
    
    const jobDocRef = doc(firestore, 'jobCards', jobToDelete.id);
    deleteDocumentNonBlocking(jobDocRef);

    toast({
      title: "Job Card Deleted",
      description: `Job Card for "${jobToDelete.jobTitle}" has been removed.`,
    });

    setJobToDelete(null);
  };

  const getStatusBadge = (status: JobCard['status']) => {
    const statusClasses = {
        Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
        Assigned: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
        'In Progress': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700',
        Completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
        Cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
    };
    return <Badge variant="outline" className={cn("text-[10px] sm:text-xs", statusClasses[status])}>{status}</Badge>;
  }

  const renderActions = (job: JobCard) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <EllipsisVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
            <DropdownMenuItem onSelect={() => openFormDialog(job)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeleteDialog(job)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Job Cards</CardTitle>
                <CardDescription className="hidden sm:block">Manage all service and repair jobs.</CardDescription>
              </div>
              <Button onClick={() => openFormDialog(null)} size="sm" className="h-8 text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add Job Card
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-3 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 sm:px-4">Job Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Forklift</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                    </TableRow>
                  ) : jobCards && jobCards.length > 0 ? (
                    jobCards.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="px-3 sm:px-4">
                          <div className="font-medium text-xs sm:text-sm">{job.jobTitle}</div>
                          <div className="text-[10px] text-muted-foreground">{format(new Date(job.creationDate), "PP")}</div>
                          <div className="text-[10px] text-muted-foreground sm:hidden">{companyMap.get(job.companyId) || ''}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{companyMap.get(job.companyId) || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{forkliftMap.get(job.forkliftId) || 'N/A'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{job.employeeId ? employeeMap.get(job.employeeId) : 'Unassigned'}</TableCell>
                        <TableCell className="px-3 sm:px-4">{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-right px-3 sm:px-4">
                           {renderActions(job)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">No job cards found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) closeAllDialogs()}}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 sm:p-6 pb-0">
            <DialogTitle>{selectedJob ? 'Edit Job Card' : 'Add New Job Card'}</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedJob ? 'Update service details.' : 'Fill out the form.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-4 sm:px-6">
            <JobCardForm 
              onSubmit={handleFormSubmit}
              onCancel={closeAllDialogs}
              initialData={selectedJob || undefined}
              mode={selectedJob ? 'edit' : 'add'}
              companies={companies || []}
              forklifts={forklifts || []}
              employees={employees || []}
            />
          </div>
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex gap-2">
              <Button variant="outline" type="button" onClick={closeAllDialogs} className="h-9">
                Cancel
              </Button>
              <Button type="submit" form="job-card-form" className="h-9">
                {selectedJob ? 'Update' : 'Save'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Delete job card: <span className="font-medium">{jobToDelete?.jobTitle}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-9 bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
