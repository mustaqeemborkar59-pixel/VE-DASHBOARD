
'use client';

import React from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function QuotationsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-10 w-10 text-primary opacity-40" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">AI Feature Not Available</h1>
        <p className="text-muted-foreground max-w-md">
          The AI Quotation Generator has been disabled. Please contact support if you need this feature re-enabled.
        </p>
      </div>
    </AppLayout>
  );
}
