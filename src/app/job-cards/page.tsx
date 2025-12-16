'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { ServiceRequest, Employee, Forklift } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Wrench, User, Calendar, MessageSquare } from "lucide-react";
import { useState } from "react";
import { ForkliftIcon } from "@/components/icons/forklift-icon";

export default function JobCardsPage() {
  const { firestore } = useFirebase();

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const jobCardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), where('status', '!=', 'Pending')) : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);

  const { data: jobCards, isLoading: isLoadingJobs } = useCollection<ServiceRequest>(jobCardsQuery);
  const { data: employees, isLoading: isLoadingTechs } = useCollection<Employee>(employeesQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const getForkliftInfo = (id: string) => {
    const forklift = forklifts?.find(f => f.id === id);
    if (!forklift) return { info: 'Unknown Forklift', serial: 'N/A' };
    return { info: `${forklift.make} ${forklift.model}`, serial: forklift.serialNumber };
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return 'Unassigned';
    const tech = employees?.find(t => t.id === id);
    return tech ? tech.fullName : 'Unassigned';
  }

  const getStatusBadge = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Assigned':
        return <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:border-blue-500/50 dark:text-blue-400">Assigned</Badge>;
      case 'In Progress':
        return <Badge variant="outline" className="border-primary/50 text-primary">In Progress</Badge>;
      case 'Completed':
        return <Badge className="bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/15 dark:text-green-400 dark:border-green-400/30">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  }

  const isLoading = isLoadingJobs || isLoadingTechs || isLoadingForklifts;

  return (
    <>
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Cards</h1>
            <p className="text-muted-foreground">Manage all active and completed service requests.</p>
          </div>
        </div>
        {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 w-3/4 bg-muted rounded"></div><div className="h-4 w-1/2 bg-muted rounded mt-2"></div></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-4 w-full bg-muted rounded"></div>
                    <div className="h-4 w-2/3 bg-muted rounded"></div>
                    <div className="h-4 w-1/2 bg-muted rounded"></div>
                  </CardContent>
                  <CardFooter><div className="h-10 w-full bg-muted rounded"></div></CardFooter>
                </Card>
              ))}
            </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobCards?.map((job) => {
              const forklift = getForkliftInfo(job.forkliftId);
              return (
              <Card key={job.id} className="flex flex-col hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-lg">Job: {forklift.info}</CardTitle>
                        <CardDescription>S/N: {forklift.serial}</CardDescription>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 flex-grow">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-sm">Reported Issue</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{job.issueDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-card-foreground">Assigned:</span> {getEmployeeName(job.assignedTechnicianId)}</p>
                  </div>
                   <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-card-foreground">Date:</span> {new Date(job.requestDate).toLocaleDateString()}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => handleViewDetails(job)}>
                    <Wrench className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            )})}
          </div>
        )}
    </div>

    {/* View Details Dialog */}
    <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Service Request Details</DialogTitle>
          <DialogDescription>
            Complete information for request ID: <span className="font-medium">{selectedRequest?.id}</span>
          </DialogDescription>
        </DialogHeader>
        {selectedRequest && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <div>{getStatusBadge(selectedRequest.status)}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Request Date</span>
              <span className="text-sm">{new Date(selectedRequest.requestDate).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Forklift</span>
              <span className="text-sm">{getForkliftInfo(selectedRequest.forkliftId).info} ({getForkliftInfo(selectedRequest.forkliftId).serial})</span>
            </div>
             <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Assigned To</span>
              <span className="text-sm">{getEmployeeName(selectedRequest.assignedTechnicianId)}</span>
            </div>
            <div className="grid grid-cols-1 items-start gap-2">
              <span className="text-sm font-medium text-muted-foreground">Reported Issue</span>
              <p className="text-sm p-3 bg-muted/50 rounded-md border">{selectedRequest.issueDescription}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
