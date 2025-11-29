import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import IssuesList from "@/pages/issues-list";
import IssueDetail from "@/pages/issue-detail";
import IssueNew from "@/pages/issue-new";
import IssueEdit from "@/pages/issue-edit";
import TeamChat from "@/pages/team-chat";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import PublicChat from "@/pages/public-chat";
import TrialExpired from "@/pages/trial-expired";
import { Skeleton } from "@/components/ui/skeleton";
import { isTrialExpired } from "@shared/trial";
import type { Workspace } from "@shared/schema";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Fetch workspace for authenticated users
  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>({
    queryKey: ["/api/workspace"],
    enabled: isAuthenticated && !!user?.workspaceId,
  });

  // Public routes that don't require authentication
  const publicRoutes = (
    <Switch>
      <Route path="/chat/:slug" component={PublicChat} />
      <Route path="/" component={Landing} />
      <Route component={Landing} />
    </Switch>
  );

  // Loading state
  if (isLoading || (isAuthenticated && user?.workspaceId && workspaceLoading)) {
    return <LoadingScreen />;
  }

  // Not authenticated - show public routes
  if (!isAuthenticated) {
    return publicRoutes;
  }

  // Authenticated but needs onboarding
  if (!user?.onboardingCompleted) {
    return (
      <Switch>
        <Route path="/chat/:slug" component={PublicChat} />
        <Route component={() => <Onboarding isNewWorkspace={!user?.workspaceId} />} />
      </Switch>
    );
  }

  // Check if trial has expired
  if (workspace && isTrialExpired(workspace)) {
    return <TrialExpired />;
  }

  // Fully authenticated with completed onboarding and valid trial
  return (
    <Switch>
      <Route path="/chat/:slug" component={PublicChat} />
      <Route path="/">
        <AuthenticatedLayout>
          <Dashboard />
        </AuthenticatedLayout>
      </Route>
      <Route path="/issues">
        <AuthenticatedLayout>
          <IssuesList />
        </AuthenticatedLayout>
      </Route>
      <Route path="/issues/new">
        <AuthenticatedLayout>
          <IssueNew />
        </AuthenticatedLayout>
      </Route>
      <Route path="/issues/:id/team-chat">
        <AuthenticatedLayout>
          <TeamChat />
        </AuthenticatedLayout>
      </Route>
      <Route path="/issues/:id/edit">
        <AuthenticatedLayout>
          <IssueEdit />
        </AuthenticatedLayout>
      </Route>
      <Route path="/issues/:id">
        <AuthenticatedLayout>
          <IssueDetail />
        </AuthenticatedLayout>
      </Route>
      <Route path="/team">
        <AuthenticatedLayout>
          <Team />
        </AuthenticatedLayout>
      </Route>
      <Route path="/settings">
        <AuthenticatedLayout>
          <Settings />
        </AuthenticatedLayout>
      </Route>
      <Route>
        <AuthenticatedLayout>
          <NotFound />
        </AuthenticatedLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
