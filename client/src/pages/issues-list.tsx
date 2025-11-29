import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CircleDot,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  MessageSquare,
  Star,
} from "lucide-react";
import type { IssueWithDetails, User } from "@shared/schema";

type StatusFilter = "all" | "open" | "closed" | "won" | "lost";

function IssueRow({ issue }: { issue: IssueWithDetails }) {
  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    open: { icon: CircleDot, color: "text-green-500", bg: "bg-green-500/10" },
    closed: { icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
    won: { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
    lost: { icon: CheckCircle2, color: "text-red-500", bg: "bg-red-500/10" },
  };

  const config = statusConfig[issue.status] || statusConfig.open;
  const StatusIcon = config.icon;

  const displayedAssignees = issue.assignees?.slice(0, 3) || [];
  const extraAssignees = (issue.assignees?.length || 0) - 3;

  return (
    <Link href={`/issues/${issue.id}`}>
      <div
        className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
        data-testid={`issue-row-${issue.id}`}
      >
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{issue.title}</span>
            {issue.isPublished && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              </div>
            )}
            {issue.labels?.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>#{issue.issueNumber}</span>
            <span>•</span>
            <span>
              opened by {issue.createdBy?.firstName || "Unknown"}{" "}
              {issue.createdAt &&
                new Date(issue.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
            </span>
            {issue.contactCompany && (
              <>
                <span>•</span>
                <span>{issue.contactCompany}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {displayedAssignees.length > 0 && (
            <div className="flex -space-x-2">
              {displayedAssignees.map(
                (assignee, idx) =>
                  assignee && (
                    <Avatar
                      key={assignee.id || idx}
                      className="h-6 w-6 border-2 border-background"
                    >
                      <AvatarImage
                        src={assignee.profileImageUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {assignee.firstName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )
              )}
              {extraAssignees > 0 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{extraAssignees}
                </div>
              )}
            </div>
          )}

          {issue.commentCount !== undefined && issue.commentCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">{issue.commentCount}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function IssuesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: issues, isLoading } = useQuery<IssueWithDetails[]>({
    queryKey: statusFilter === "all" ? ["/api/issues"] : ["/api/issues", { status: statusFilter }],
  });

  const filteredIssues = issues?.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.contactName?.toLowerCase().includes(query) ||
      issue.contactCompany?.toLowerCase().includes(query) ||
      issue.issueNumber.toString().includes(query)
    );
  });

  const openCount = issues?.filter((i) => i.status === "open").length || 0;
  const closedCount = issues?.filter((i) => i.status !== "open").length || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-issues-title">Issues</h1>
        <Button asChild data-testid="button-new-issue">
          <Link href="/issues/new">
            <Plus className="mr-2 h-4 w-4" />
            New Issue
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-issues"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-filter-status">
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("open")}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("closed")}>
                Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("won")}>
                Won
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("lost")}>
                Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-4">
          <button
            onClick={() => setStatusFilter("open")}
            className={`flex items-center gap-2 text-sm font-medium ${
              statusFilter === "open" || statusFilter === "all"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="filter-open"
          >
            <CircleDot className="h-4 w-4" />
            <span>{openCount} Open</span>
          </button>
          <button
            onClick={() => setStatusFilter("closed")}
            className={`flex items-center gap-2 text-sm font-medium ${
              statusFilter === "closed"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="filter-closed"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{closedCount} Closed</span>
          </button>
        </div>

        <div className="divide-y">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-64 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))
          ) : filteredIssues && filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))
          ) : (
            <div className="text-center py-16">
              <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">
                {searchQuery ? "No matching issues" : "No issues yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Create your first issue to start tracking deals and contacts"}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/issues/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Issue
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
