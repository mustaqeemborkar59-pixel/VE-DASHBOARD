
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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobCard | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const jobCardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'jobCards'), orderBy('creationDate', 'desc')) : null, [firestore]);
  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'forklifts'), orderBy('serialNumber', 'asc')) : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('fullName', 'asc')) : null, [firestore]);
  
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
    return <Badge variant="outline" className={cn(statusClasses[status])}>{status}</Badge>;
  }

  const renderActions = (job: JobCard) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <EllipsisVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Cards</CardTitle>
              <CardDescription>Manage all service and repair jobs for your fleet.</CardDescription>
            </div>
            <Button onClick={() => openFormDialog(null)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Job Card
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Forklift</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Loading job cards...</TableCell>
                </TableRow>
              ) : jobCards && jobCards.length > 0 ? (
                jobCards.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium">{job.jobTitle}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(job.creationDate), "PP")}</div>
                    </TableCell>
                    <TableCell>{companyMap.get(job.companyId) || 'N/A'}</TableCell>
                    <TableCell>{forkliftMap.get(job.forkliftId) || 'N/A'}</TableCell>
                    <TableCell>{job.employeeId ? employeeMap.get(job.employeeId) : 'Unassigned'}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-right">
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
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) closeAllDialogs()}}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedJob ? 'Edit Job Card' : 'Add New Job Card'}</DialogTitle>
            <DialogDescription>
              {selectedJob ? 'Update the details of this service job.' : 'Fill out the form to create a new job card.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6">
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
          <DialogFooter className="p-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={closeAllDialogs}>
                Cancel
              </Button>
              <Button type="submit" form="job-card-form">
                {selectedJob ? 'Update Job Card' : 'Save Job Card'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job card: <span className="font-medium">{jobToDelete?.jobTitle}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
