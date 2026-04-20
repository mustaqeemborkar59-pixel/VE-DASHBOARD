
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { Loader2, CloudDownload, RefreshCw, AlertCircle, LogIn, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// --- CONFIGURATION ---
// Replace with your actual Client ID from Azure Portal
const CLIENT_ID = "YOUR_MICROSOFT_CLIENT_ID_HERE"; 
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin + "/external-data" : "";
const DRIVE_ITEM_ID = "98C0A5C5C96DD3CB!s79844874d84f47928a0a0a182144ee37";

const msalConfig = {
    auth: {
        clientId: CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: REDIRECT_URI,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

const loginRequest = {
    scopes: ["User.Read", "Files.Read"]
};

// Initialize MSAL outside component
let msalInstance: PublicClientApplication | null = null;
if (typeof window !== 'undefined' && CLIENT_ID !== "YOUR_MICROSOFT_CLIENT_ID_HERE") {
    msalInstance = new PublicClientApplication(msalConfig);
}

export default function ExternalDataPage() {
    const [data, setData] = useState<any[][]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    // Initialize Auth State
    useEffect(() => {
        if (!msalInstance) return;
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            setIsAuthenticated(true);
        }
    }, []);

    const fetchExcelData = useCallback(async () => {
        if (!msalInstance) return;
        setLoading(true);
        setError(null);

        try {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length === 0) throw new Error("Please log in first.");

            // Request Token
            let response;
            try {
                response = await msalInstance.acquireTokenSilent({
                    ...loginRequest,
                    account: accounts[0]
                });
            } catch (err) {
                if (err instanceof InteractionRequiredAuthError) {
                    await msalInstance.acquireTokenPopup(loginRequest);
                    return;
                }
                throw err;
            }

            const token = response.accessToken;
            
            // Microsoft Graph API Endpoint for used range in Sheet1
            const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${DRIVE_ITEM_ID}/workbook/worksheets('Sheet1')/usedRange`;

            const res = await fetch(graphUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || "Failed to fetch Excel data.");
            }

            const excelJson = await res.json();
            const values = excelJson.values; // Array of arrays

            if (values && values.length > 0) {
                setData(values);
                setLastRefreshed(new Date());
            } else {
                setData([]);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh logic (30 seconds)
    useEffect(() => {
        if (isAuthenticated) {
            fetchExcelData();
            const interval = setInterval(fetchExcelData, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchExcelData]);

    const handleLogin = async () => {
        if (!msalInstance) {
            alert("Microsoft Client ID is not configured. Please check src/app/external-data/page.tsx");
            return;
        }
        try {
            await msalInstance.initialize();
            await msalInstance.loginPopup(loginRequest);
            setIsAuthenticated(true);
            fetchExcelData();
        } catch (err) {
            console.error("Login failed", err);
            setError("Login failed. Check your Microsoft App configuration.");
        }
    };

    const handleLogout = () => {
        if (!msalInstance) return;
        msalInstance.logoutPopup();
        setIsAuthenticated(false);
        setData([]);
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <CloudDownload className="h-7 w-7 text-blue-600" />
                            OneDrive Live Sync
                        </h1>
                        <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
                            Real-time data from Microsoft Excel
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                <Badge variant="outline" className="h-9 px-3 bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <RefreshCw className={cn("mr-1.5 h-3 w-3", loading && "animate-spin")} />
                                    {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Syncing...'}
                                </Badge>
                                <Button variant="outline" onClick={handleLogout} className="h-9 text-xs font-bold">Sign Out</Button>
                            </>
                        ) : (
                            <Button onClick={handleLogin} className="h-9 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold">
                                <LogIn className="mr-2 h-4 w-4" /> Microsoft Login
                            </Button>
                        )}
                    </div>
                </div>

                {!isAuthenticated ? (
                    <Card className="border-2 border-dashed bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center">
                                <Database className="h-10 w-10 text-blue-600 opacity-40" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black">Authentication Required</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Connect your Microsoft account to access the remote Excel database securely using Microsoft Graph API.
                                </p>
                            </div>
                            {CLIENT_ID === "YOUR_MICROSOFT_CLIENT_ID_HERE" && (
                                <Alert variant="destructive" className="max-w-md text-left">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Developer Configuration Missing</AlertTitle>
                                    <AlertDescription>
                                        You need to set a valid <strong>Client ID</strong> from Azure Portal in <code>src/app/external-data/page.tsx</code> to use this feature.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Sync Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    Excel Row Data
                                    {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                                </CardTitle>
                                <CardDescription>Displaying data from worksheet 'Sheet1'</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    {data.length > 0 ? (
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    {data[0].map((header, i) => (
                                                        <TableHead key={i} className="font-black text-[11px] uppercase tracking-wider text-muted-foreground">
                                                            {header || `Col ${i + 1}`}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.slice(1).map((row, rowIndex) => (
                                                    <TableRow key={rowIndex} className="hover:bg-muted/30 border-b">
                                                        {row.map((cell, cellIndex) => (
                                                            <TableCell key={cellIndex} className="text-sm font-medium py-3">
                                                                {cell !== null && cell !== undefined ? String(cell) : '-'}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="py-20 text-center">
                                            {loading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                                    <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase">Fetching Remote Workbook...</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No data found in Sheet1 or file is inaccessible.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-dashed text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            <Info className="h-4 w-4 text-blue-600" />
                            Note: Access is managed via Microsoft Graph API. Changes in Excel will reflect here every 30 seconds.
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// Minimal Info Icon replacement if needed
function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
