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
import { MoreHorizontal, PlusCircle, Eye } from "lucide-react";
import { useCollection, useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ServiceRequestForm, ServiceRequestFormData } from "@/components/service-request-form";


export default function ServiceRequestsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);

  const serviceRequestsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'serviceRequests') : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);

  const { data: serviceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  const { data: employees, isLoading: isLoadingTechs } = useCollection<Employee>(employeesQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const getForkliftInfo = (id: string) => {
    const forklift = forklifts?.find(f => f.id === id);
    if (!forklift) return 'Unknown Forklift';
    return `${forklift.make} ${forklift.model}`;
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return 'Unassigned';
    const tech = employees?.find(t => t.id === id);
    return tech ? tech.fullName : 'Unassigned';
  }

  const handleUpdateStatus = (requestId: string, status: ServiceRequest['status']) => {
    if (!firestore) return;
    setIsDropdownOpen(null); // Close dropdown
    const requestRef = doc(firestore, 'serviceRequests', requestId);
    updateDocumentNonBlocking(requestRef, { status });
  }

  const handleAssignTechnician = (requestId: string, technicianId: string) => {
    if (!firestore) return;
    setIsDropdownOpen(null); // Close dropdown
    const requestRef = doc(firestore, 'serviceRequests', requestId);
    updateDocumentNonBlocking(requestRef, { assignedTechnicianId: technicianId, status: 'Assigned' });
  }

  const handleFormSubmit = (formData: ServiceRequestFormData) => {
    if (!firestore) return;

    addDocumentNonBlocking(collection(firestore, 'serviceRequests'), {
      ...formData,
      status: 'Pending',
      requestDate: new Date().toISOString(),
    });

    toast({
      title: "Success",
      description: "Service request submitted successfully.",
    });

    setIsFormDialogOpen(false);
  };
  
  const handleViewDetails = (request: ServiceRequest) => {
    setIsDropdownOpen(null);
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  }

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
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Requests</CardTitle>
            <CardDescription>Manage and assign forklift service requests.</CardDescription>
          </div>
          <Button onClick={() => setIsFormDialogOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Request
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Forklift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : (
              serviceRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{getForkliftInfo(request.forkliftId)}</div>
                    <div className="text-sm text-muted-foreground">{forklifts?.find(f => f.id === request.forkliftId)?.serialNumber}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>{getEmployeeName(request.assignedTechnicianId)}</TableCell>
                  <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(request)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                      </Button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu open={isDropdownOpen === request.id} onOpenChange={(open) => setIsDropdownOpen(open ? request.id : null)}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                              <DropdownMenuItem onSelect={() => handleUpdateStatus(request.id, 'Completed')}>Completed</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* New Service Request Dialog */}
    <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
            <DialogDescription>
              Fill out the form to request maintenance for a forklift.
            </DialogDescription>
          </DialogHeader>
          <ServiceRequestForm
            forklifts={forklifts || []}
            isLoadingForklifts={isLoadingForklifts}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
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
              <span className="text-sm">{getForkliftInfo(selectedRequest.forkliftId)} ({forklifts?.find(f=>f.id === selectedRequest.forkliftId)?.serialNumber})</span>
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
