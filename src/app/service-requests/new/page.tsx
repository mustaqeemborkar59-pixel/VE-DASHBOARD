'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceRequestForm } from "@/components/service-request-form";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Forklift } from "@/lib/data";
import AppLayout from "@/components/app-layout";

export default function NewServiceRequestPage() {
  const { firestore } = useFirebase();
  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);

  return (
    <AppLayout>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>New Service Request</CardTitle>
            <CardDescription>
              Fill out the form to request maintenance for a forklift.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceRequestForm
              forklifts={forklifts || []}
              isLoadingForklifts={isLoadingForklifts}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
