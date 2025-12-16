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
import { ServiceRequest, Technician, Forklift } from "@/lib/data";
import Link from 'next/link';
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
} from "@/components/ui/dialog"
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ServiceRequestForm, ServiceRequestFormData } from "@/components/service-request-form";


export default function ServiceRequestsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const serviceRequestsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'serviceRequests') : null, [firestore]);
  const techniciansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'technicians') : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);

  const { data: serviceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  const { data: technicians, isLoading: isLoadingTechs } = useCollection<Technician>(techniciansQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const getForkliftModel = (id: string) => forklifts?.find(f => f.id === id)?.model || 'Unknown';
  const getTechnicianName = (id?: string) => {
    if (!id) return 'Unassigned';
    const tech = technicians?.find(t => t.id === id);
    return tech ? `${tech.firstName} ${tech.lastName}` : 'Unassigned';
  }

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

    setIsDialogOpen(false);
  };


  const getStatusBadge = (status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed') => {
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
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
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
              <TableHead>Issue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Date</TableHead>
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
                    <div className="font-medium">{request.forkliftId}</div>
                    <div className="text-sm text-muted-foreground">{getForkliftModel(request.forkliftId)}</div>
                  </TableCell>
                  <TableCell className="max-w-sm truncate">{request.issueDescription}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>{getTechnicianName(request.assignedTechnicianId)}</TableCell>
                  <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Assign Technician</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {technicians?.map(tech => (
                              <DropdownMenuItem key={tech.id} onClick={() => handleAssignTechnician(request.id, tech.id)}>
                                {tech.firstName} {tech.lastName}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Pending')}>Pending</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'In Progress')}>In Progress</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Completed')}>Completed</DropdownMenuItem>
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

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
