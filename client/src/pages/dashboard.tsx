import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CircleDot,
  CheckCircle2,
  TrendingUp,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
} from "lucide-react";
import type { Issue, User, Activity } from "@shared/schema";

interface DashboardStats {
  openIssues: number;
  closedIssues: number;
  totalValue: number;
  teamMembers: number;
}

interface RecentActivity {
  id: string;
  action: string;
  issueTitle: string;
  issueId: string;
  userName: string;
  userImage?: string;
  createdAt: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getActionText = (action: string) => {
    switch (action) {
      case "created":
        return "created";
      case "commented":
        return "commented on";
      case "status_changed":
        return "updated status for";
      case "assigned":
        return "was assigned to";
      case "mentioned":
        return "was mentioned in";
      default:
        return action;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={activity.userImage} className="object-cover" />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {activity.userName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.userName}</span>{" "}
          <span className="text-muted-foreground">
            {getActionText(activity.action)}
          </span>{" "}
          <Link
            href={`/issues/${activity.issueId}`}
            className="font-medium text-primary hover:underline"
          >
            {activity.issueTitle}
          </Link>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(activity.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function RecentIssueCard({ issue }: { issue: Issue }) {
  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-600 dark:text-green-400",
    closed: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    won: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    lost: "bg-red-500/10 text-red-500",
  };

  return (
    <Link href={`/issues/${issue.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover-elevate cursor-pointer">
        <CircleDot
          className={`h-5 w-5 flex-shrink-0 ${
            issue.status === "open"
              ? "text-green-500"
              : issue.status === "closed"
              ? "text-purple-500"
              : issue.status === "won"
              ? "text-blue-500"
              : "text-red-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{issue.title}</p>
          <p className="text-sm text-muted-foreground">
            #{issue.issueNumber} • {issue.contactCompany || "No company"}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={`${statusColors[issue.status]} capitalize`}
        >
          {issue.status}
        </Badge>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentIssues, isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues", { limit: 5 }],
  });

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<
    RecentActivity[]
  >({
    queryKey: ["/api/activities/recent"],
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your deals.
          </p>
        </div>
        <Button asChild data-testid="button-new-issue-dashboard">
          <Link href="/issues/new">
            <Plus className="mr-2 h-4 w-4" />
            New Issue
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Open Issues"
              value={stats?.openIssues || 0}
              icon={CircleDot}
              trend="Active deals in progress"
            />
            <StatCard
              title="Closed Issues"
              value={stats?.closedIssues || 0}
              icon={CheckCircle2}
              trend="Completed this month"
            />
            <StatCard
              title="Total Value"
              value={`$${((stats?.totalValue || 0) / 1000).toFixed(0)}k`}
              icon={TrendingUp}
              trend="Pipeline value"
            />
            <StatCard
              title="Team Members"
              value={stats?.teamMembers || 0}
              icon={Users}
              trend="Active collaborators"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Recent Issues</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/issues" data-testid="link-view-all-issues">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {issuesLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))
              ) : recentIssues && recentIssues.length > 0 ? (
                recentIssues.map((issue) => (
                  <RecentIssueCard key={issue.id} issue={issue} />
                ))
              ) : (
                <div className="text-center py-12">
                  <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No issues yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first issue to start tracking deals
                  </p>
                  <Button asChild>
                    <Link href="/issues/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Issue
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities && recentActivities.length > 0 ? (
                <div className="divide-y">
                  {recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No activity yet. Start collaborating on issues!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
