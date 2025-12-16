'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, ClipboardList, LayoutDashboard, Wrench, Warehouse, LogOut, Settings, User } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ForkliftIcon } from './icons/forklift-icon';
import { useFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/service-requests', label: 'Service Requests', icon: Wrench },
  { href: '/job-cards', label: 'Job Cards', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/reports', label: 'Reports', icon: BarChart },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { auth, user, isUserLoading } = useFirebase();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Initiate sign-in only on the client and if needed
    if (isClient && auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [isClient, auth, user, isUserLoading]);

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const userEmail = user?.isAnonymous ? 'Anonymous User' : (user?.email || 'Not logged in');
  const userInitial = user?.isAnonymous ? 'A' : (user?.email?.[0]?.toUpperCase() || '?');
  
  if (!isClient || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ForkliftIcon className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Connecting to the workshop...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ForkliftIcon className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight">ForkliftFlow</h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{children: item.label, side: 'right', align: 'center'}}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className='flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2'>
                    <Avatar className="h-8 w-8">
                        {user && !user.isAnonymous && user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ''} />}
                        <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start overflow-hidden">
                        <span className="truncate font-medium">{user?.displayName || userEmail}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.isAnonymous ? 'Logged in anonymously' : user?.email}</span>
                    </div>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName || userEmail}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.isAnonymous ? 'Anonymous' : user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled><User className="mr-2 h-4 w-4"/>Profile</DropdownMenuItem>
              <DropdownMenuItem disabled><Settings className="mr-2 h-4 w-4"/>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/>Log out</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => auth && initiateAnonymousSignIn(auth)}><LogOut className="mr-2 h-4 w-4"/>Log in</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1">
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
