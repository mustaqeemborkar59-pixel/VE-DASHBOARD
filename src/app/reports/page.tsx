"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import AppLayout from "@/components/app-layout";

const monthlyRepairsData = [
  { month: "Jan", repairs: 18 },
  { month: "Feb", repairs: 22 },
  { month: "Mar", repairs: 35 },
  { month: "Apr", repairs: 28 },
  { month: "May", repairs: 41 },
  { month: "Jun", repairs: 39 },
];

const partsConsumptionData = [
    { part: "Oil Filters", consumed: 50 },
    { part: "Brake Pads", consumed: 25 },
    { part: "Hydraulic Fluid", consumed: 80 },
    { part: "Tires", consumed: 16 },
    { part: "Batteries", consumed: 10 },
]

const chartConfig = {
  repairs: {
    label: "Repairs",
    color: "hsl(var(--primary))",
  },
  consumed: {
    label: "Units Consumed",
    color: "hsl(var(--primary))",
  }
} as const

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
              <p className="text-muted-foreground">Weekly and monthly reports on repairs and parts.</p>
            </div>
          </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Repairs</CardTitle>
              <CardDescription>Total number of completed repairs per month (mock data).</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={monthlyRepairsData}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="repairs" fill="var(--color-repairs)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Parts Consumption</CardTitle>
              <CardDescription>Top consumed parts in the last 30 days (mock data).</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={partsConsumptionData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="part" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
                  <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="consumed" layout="vertical" fill="var(--color-consumed)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
