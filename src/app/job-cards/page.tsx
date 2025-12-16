'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceRequest, Technician, Forklift } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

export default function JobCardsPage() {
  const { firestore } = useFirebase();

  const jobCardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), where('status', '!=', 'Pending')) : null, [firestore]);
  const techniciansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'technicians') : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);

  const { data: jobCards, isLoading: isLoadingJobs } = useCollection<ServiceRequest>(jobCardsQuery);
  const { data: technicians, isLoading: isLoadingTechs } = useCollection<Technician>(techniciansQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const getForkliftModel = (id: string) => forklifts?.find(f => f.id === id)?.model || 'Unknown';
  const getTechnicianName = (id?: string) => {
    if (!id) return 'N/A';
    const tech = technicians?.find(t => t.id === id);
    return tech ? `${tech.firstName} ${tech.lastName}` : 'N/A';
  }

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

  const isLoading = isLoadingJobs || isLoadingTechs || isLoadingForklifts;

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Cards</h1>
            <p className="text-muted-foreground">Generated job cards for assigned service requests.</p>
          </div>
        </div>
        {isLoading ? (
            <p className="text-center">Loading job cards...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobCards?.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Job Card: {job.id}</CardTitle>
                        <CardDescription>Forklift: {job.forkliftId} ({getForkliftModel(job.forkliftId)})</CardDescription>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 flex-grow">
                  <div>
                    <h3 className="font-semibold text-sm">Reported Issue</h3>
                    <p className="text-sm text-muted-foreground">{job.issueDescription}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Assigned Technician</h3>
                    <p className="text-sm text-muted-foreground">{getTechnicianName(job.assignedTechnicianId)}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
