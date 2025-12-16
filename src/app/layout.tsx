import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/app-layout";
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'ForkliftFlow',
  description: 'Manage your forklift workshop with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AppLayout>{children}</AppLayout>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
