import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  LayoutDashboard,
  CircleDot,
  Users,
  Settings,
  LogOut,
  Star,
  Plus,
  DollarSign,
  Receipt,
  ShoppingCart,
  Building2,
  CreditCard,
  Package,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User, Workspace } from "@shared/schema";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Issues", url: "/issues", icon: CircleDot },
  { title: "Accounts Payable", url: "/ap", icon: Receipt },
  { title: "Accounts Receivable", url: "/ar", icon: DollarSign },
  { title: "Procurement", url: "/procurement", icon: ShoppingCart },
  { title: "Team", url: "/team", icon: Users },
];

const settingsNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

function getInitials(user: User | null | undefined): string {
  if (!user) return "?";
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  if (first || last) return (first + last).toUpperCase();
  return user.email?.[0]?.toUpperCase() || "?";
}

function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "Unknown User";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email || "Unknown User";
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: workspace } = useQuery<Workspace | null>({
    queryKey: ["/api/workspace"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.workspaceId,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="Crannies CRM"
            className="h-9 w-9 object-contain flex-shrink-0"
          />
          <span className="text-sm font-semibold truncate">Crannies CRM</span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/"
                        ? location === "/"
                        : location.startsWith(item.url)
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New Issue">
                  <Link href="/issues/new" data-testid="nav-new-issue">
                    <Plus className="h-4 w-4" />
                    <span>New Issue</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New Vendor">
                  <Link href="/ap/vendors/new" data-testid="nav-new-vendor">
                    <Building2 className="h-4 w-4" />
                    <span>New Vendor</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New Invoice">
                  <Link href="/ar/invoices/new" data-testid="nav-new-invoice">
                    <CreditCard className="h-4 w-4" />
                    <span>New Invoice</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New Purchase Order">
                  <Link href="/procurement/purchase-orders/new" data-testid="nav-new-po">
                    <Package className="h-4 w-4" />
                    <span>New PO</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user?.profileImageUrl || undefined}
                alt={getUserDisplayName(user)}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            {user?.isAdmin && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                <Star className="h-2.5 w-2.5 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role || "Team Member"} {user?.teamName ? `• ${user.teamName}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-logout"
          >
            <a href="/api/logout">
              <LogOut className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
