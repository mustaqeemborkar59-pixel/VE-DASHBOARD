'use client';
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceRequest, Employee, Forklift } from "@/lib/data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query } from "firebase/firestore";
import { useState, useMemo, useCallback } from "react";
import AppLayout from "@/components/app-layout";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceRequestForm } from "@/components/service-request-form";


export default function ServiceRequestsPage() {
  const { firestore } = useFirebase();
  const [isJobLogDialogOpen, setIsJobLogDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);

  // Form state for the job log dialog
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState<string[]>([]);

  const serviceRequestsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'serviceRequests') : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);

  const { data: serviceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  const { data: employees, isLoading: isLoadingTechs } = useCollection<Employee>(employeesQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const { activeRequests, completedRequests } = useMemo(() => {
    const active = serviceRequests?.filter(r => r.status !== 'Completed').sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()) || [];
    const completed = serviceRequests?.filter(r => r.status === 'Completed').sort((a, b) => new Date(b.completionDate || 0).getTime() - new Date(a.completionDate || 0).getTime()) || [];
    return { activeRequests: active, completedRequests: completed };
  }, [serviceRequests]);

  const getForkliftInfo = useCallback((id: string) => {
    const forklift = forklifts?.find(f => f.id === id);
    if (!forklift) return { name: 'Unknown Forklift', serial: '', site: 'N/A' };
    return {
      name: `${forklift.make} ${forklift.model}`,
      serial: forklift.serialNumber,
      site: forklift.locationType === 'On-Site' ? (forklift.siteCompany || 'On-Site') : forklift.locationType,
    }
  }, [forklifts]);

  const getEmployeeName = useCallback((id?: string) => {
    if (!id) return 'Unassigned';
    const tech = employees?.find(t => t.id === id);
    return tech ? tech.fullName : 'Unassigned';
  }, [employees]);

  const handleUpdateStatus = (requestId: string, status: ServiceRequest['status']) => {
    if (!firestore) return;
    const requestRef = doc(firestore, 'serviceRequests', requestId);
    updateDocumentNonBlocking(requestRef, { status });
  }

  const handleAssignTechnician = (requestId: string, technicianId: string) => {
    if (!firestore) return;
    const requestRef = doc(firestore, 'serviceRequests', requestId);
    updateDocumentNonBlocking(requestRef, { assignedTechnicianId: technicianId, status: 'Assigned' });
  }

  const closeAllDialogs = useCallback(() => {
    setIsJobLogDialogOpen(false);
    setSelectedRequest(null);
    setIsNewRequestDialogOpen(false);
  }, []);

  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };
  
  const openJobLogDialog = useCallback((request: ServiceRequest) => {
    closeAllDialogs();
    setSelectedRequest(request);
    setTechnicianNotes(request.technicianNotes || '');
    setPartsUsed(request.partsUsed || []);
    handleDelayedAction(() => setIsJobLogDialogOpen(true));
  }, [closeAllDialogs]);

  const handleSaveJobLog = () => {
    if (!firestore || !selectedRequest) return;

    const requestRef = doc(firestore, 'serviceRequests', selectedRequest.id);
    updateDocumentNonBlocking(requestRef, {
      technicianNotes,
      partsUsed,
      status: 'Completed',
      completionDate: new Date().toISOString(),
    });

    closeAllDialogs();
  };
  
  const getStatusBadge = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Assigned':
        return <Badge variant="outline">Assigned</Badge>;
      case 'In Progress':
        return <Badge variant="outline" className="border-primary/50 text-primary">In Progress</Badge>;
      case 'Completed':
        return <Badge className="bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/15">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = isLoadingRequests || isLoadingTechs || isLoadingForklifts;

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Management</CardTitle>
              <CardDescription>Manage and track all service requests and job histories.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsNewRequestDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Jobs</TabsTrigger>
              <TabsTrigger value="completed">Completed History</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forklift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : activeRequests.length > 0 ? (
                    activeRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{getForkliftInfo(request.forkliftId).name}</div>
                          <div className="text-sm text-muted-foreground">{getForkliftInfo(request.forkliftId).serial}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getEmployeeName(request.assignedTechnicianId)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => openJobLogDialog(request)}>
                                Log Work & Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Assign Employee</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {employees?.map(tech => (
                                    <DropdownMenuItem key={tech.id} onSelect={() => handleAssignTechnician(request.id, tech.id)}>
                                      {tech.fullName}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(request.id, 'Pending')}>Pending</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(request.id, 'In Progress')}>In Progress</DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">No active jobs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="completed">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Dates</TableHead>
                    <TableHead>Forklift / Site</TableHead>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Parts Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading history...</TableCell>
                    </TableRow>
                  ) : completedRequests.length > 0 ? (
                    completedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.completionDate ? format(new Date(request.completionDate), 'PP') : 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">Requested: {format(new Date(request.requestDate), 'PP')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getForkliftInfo(request.forkliftId).name}</div>
                          <div className="text-sm text-muted-foreground">{getForkliftInfo(request.forkliftId).site}</div>
                        </TableCell>
                        <TableCell className="max-w-sm">
                            <div className="font-medium text-primary">Reported Issue:</div>
                            <p className="pl-2 text-sm text-muted-foreground whitespace-pre-wrap">{request.issueDescription}</p>
                            {request.technicianNotes && (
                                <>
                                    <div className="font-medium text-primary mt-2">Work Performed:</div>
                                    <p className="pl-2 text-sm whitespace-pre-wrap">{request.technicianNotes}</p>
                                </>
                            )}
                        </TableCell>
                        <TableCell>{getEmployeeName(request.assignedTechnicianId)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {request.partsUsed && request.partsUsed.length > 0
                              ? request.partsUsed.map((part, i) => <Badge key={i} variant="secondary">{part}</Badge>)
                              : <span className="text-xs text-muted-foreground">None</span>
                            }
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">No completed jobs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-lg">
           <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
            <DialogDescription>
              Fill out the form to request maintenance for a forklift.
            </DialogDescription>
          </DialogHeader>
          <ServiceRequestForm
            forklifts={forklifts || []}
            isLoadingForklifts={isLoadingForklifts}
            onSuccess={() => setIsNewRequestDialogOpen(false)}
            onCancel={() => setIsNewRequestDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Log Work Dialog */}
      <Dialog open={isJobLogDialogOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Work & Complete Job</DialogTitle>
            <DialogDescription>
              Add notes and parts used for this job before marking it as complete.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
               <div className="space-y-2">
                    <p className="text-sm font-medium">Reported Issue</p>
                    <p className="text-sm p-3 bg-muted/50 rounded-md border">{selectedRequest.issueDescription}</p>
                </div>
              <div className="grid gap-2">
                <Label htmlFor="technician-notes">Technician Notes (Work Performed)</Label>
                <Textarea
                  id="technician-notes"
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Describe the work that was done..."
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parts-used">Parts Used</Label>
                <Textarea
                  id="parts-used"
                  value={partsUsed.join('\n')}
                  onChange={(e) => setPartsUsed(e.target.value.split('\n').filter(p => p.trim() !== ''))}
                  placeholder="Enter each part on a new line..."
                  className="min-h-24"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeAllDialogs}>Cancel</Button>
            <Button onClick={handleSaveJobLog}>Save & Complete Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
