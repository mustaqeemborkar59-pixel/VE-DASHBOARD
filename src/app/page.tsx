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
import { ServiceRequest, Forklift } from "@/lib/data";
import { Activity, Wrench, CheckCircle, Clock } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { firestore } = useFirebase();

  const serviceRequestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), orderBy('requestDate', 'desc')) : null, [firestore]);
  const recentRequestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), orderBy('requestDate', 'desc'), limit(5)) : null, [firestore]);
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  
  const { data: serviceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  const { data: recentRequests, isLoading: isLoadingRecent } = useCollection<ServiceRequest>(recentRequestsQuery);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  const totalRequests = serviceRequests?.length || 0;
  const pendingRequests = serviceRequests?.filter(r => r.status === 'Pending').length || 0;
  const completedRequests = serviceRequests?.filter(r => r.status === 'Completed').length || 0;
  const inProgressRequests = serviceRequests?.filter(r => r.status === 'In Progress' || r.status === 'Assigned').length || 0;

  const getForkliftModel = (id: string) => forklifts?.find(f => f.id === id)?.model || 'Unknown';

  const getStatusBadge = (status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed') => {
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
  
  const cardClassName = "border-0 bg-gradient-to-br shadow-lg";

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workshop Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive overview of your workshop's operations.</p>
          </div>
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardClassName, "from-blue-500 to-indigo-600 text-white shadow-blue-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingRequests ? '...' : totalRequests}</div>
            <p className="text-xs text-white/90">All time service requests</p>
          </CardContent>
        </Card>
        <Card className={cn(cardClassName, "from-amber-500 to-orange-600 text-white shadow-amber-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingRequests ? '...' : pendingRequests}</div>
            <p className="text-xs text-white/90">Requests awaiting assignment</p>
          </CardContent>
        </Card>
        <Card className={cn(cardClassName, "from-violet-500 to-purple-600 text-white shadow-violet-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingRequests ? '...' : inProgressRequests}</div>
            <p className="text-xs text-white/90">Jobs currently being worked on</p>
          </CardContent>
        </Card>
        <Card className={cn(cardClassName, "from-emerald-500 to-green-600 text-white shadow-emerald-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingRequests ? '...' : completedRequests}</div>
            <p className="text-xs text-white/90">Completed service requests</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Recent Service Requests</CardTitle>
                <CardDescription>
                    A summary of the most recent service requests.
                </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/service-requests">
                    View All
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forklift</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRecent || isLoadingForklifts ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                recentRequests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{forklifts?.find(f => f.id === request.forkliftId)?.serialNumber || request.forkliftId}</div>
                      <div className="text-sm text-muted-foreground">{getForkliftModel(request.forkliftId)}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.issueDescription}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
