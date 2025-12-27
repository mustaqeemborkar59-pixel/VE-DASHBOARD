'use client';
import AppLayout from "@/components/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BillingPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monthly Billing</h1>
            <p className="text-muted-foreground">
              Generate and manage your monthly invoices from here.
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Billing Generator</CardTitle>
            <CardDescription>
              This is where the billing generation tools will be.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Ready for your instructions!</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
