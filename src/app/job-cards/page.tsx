import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { serviceRequests, technicians, forklifts } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

export default function JobCardsPage() {
  const jobCards = serviceRequests.filter(sr => sr.status !== 'Pending');

  const getForkliftModel = (id: string) => forklifts.find(f => f.id === id)?.model || 'Unknown';
  const getTechnicianName = (id?: string) => technicians.find(t => t.id === id)?.name || 'N/A';

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

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Cards</h1>
            <p className="text-muted-foreground">Generated job cards for assigned service requests.</p>
          </div>
        </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobCards.map((job) => (
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
                <p className="text-sm text-muted-foreground">{job.issue}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Assigned Technician</h3>
                <p className="text-sm text-muted-foreground">{getTechnicianName(job.technicianId)}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Details</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
