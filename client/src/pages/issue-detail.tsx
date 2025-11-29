import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  CircleDot,
  CheckCircle2,
  ChevronLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Send,
  Paperclip,
  AtSign,
  Globe,
  Star,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import type { Issue, CommentWithAuthor, User } from "@shared/schema";

interface IssueDetailData extends Issue {
  assignees?: User[];
  createdBy?: User;
  comments?: CommentWithAuthor[];
}

// Utility function to render comment content with highlighted mentions
function renderCommentContent(content: string) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.match(/^@\w+$/)) {
      return (
        <span key={i} className="font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
}

function CommentCard({ 
  comment, 
  onDelete,
  canDelete 
}: { 
  comment: CommentWithAuthor;
  onDelete?: (commentId: string) => void;
  canDelete?: boolean;
}) {
  const isClientComment = comment.isClientComment;
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  return (
    <>
      <Card className={`${isClientComment ? "border-l-4 border-l-amber-500" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={comment.author?.profileImageUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback className={`text-sm font-medium ${isClientComment ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                {comment.author?.firstName?.[0] ||
                  comment.authorName?.[0] ||
                  "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {comment.author
                    ? `${comment.author.firstName || ""} ${comment.author.lastName || ""}`.trim()
                    : comment.authorName || "Unknown"}
                </span>
                {isClientComment && (
                  <Badge className="text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">
                    CLIENT
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {comment.createdAt &&
                    new Date(comment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      minute: "2-digit",
                    })}
                </span>
              </div>
              {comment.author && !isClientComment && (comment.author.role || comment.author.teamName) && (
                <div className="text-xs text-muted-foreground">
                  {comment.author.role && comment.author.teamName
                    ? `${comment.author.role} • ${comment.author.teamName}`
                    : comment.author.role || comment.author.teamName}
                </div>
              )}
            </div>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteAlert(true)}
                className="ml-2"
                data-testid="button-delete-comment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {comment.content.split("\n").map((line, i) => (
              <p key={i} className={`${i === 0 ? "mt-0" : ""} whitespace-pre-wrap`}>
                {renderCommentContent(line)}
              </p>
            ))}
          </div>
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {comment.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm hover-elevate"
                >
                  <Paperclip className="h-4 w-4" />
                  {attachment.fileName}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (onDelete) onDelete(comment.id);
              setShowDeleteAlert(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  issueId,
  isPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  isPublished: boolean;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const publishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/issues/${issueId}/publish`, { email });
    },
    onSuccess: () => {
      toast({
        title: "Issue Published",
        description: "A secure chat link has been sent to the client.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${issueId}`] });
      onOpenChange(false);
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish issue",
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/issues/${issueId}/unpublish`);
    },
    onSuccess: () => {
      toast({
        title: "Issue Unpublished",
        description: "The public chat link has been disabled.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${issueId}`] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish issue",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPublished ? "Manage Published Chat" : "Publish to Client"}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? "This issue is currently published and accessible by clients with the passcode."
              : "Create a secure chat room that clients can access with a passcode."}
          </DialogDescription>
        </DialogHeader>
        {!isPublished && (
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Client Email (optional)
            </label>
            <input
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background"
              data-testid="input-client-email"
            />
            <p className="text-xs text-muted-foreground mt-2">
              We'll send them an invitation with the chat link and passcode
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isPublished ? (
            <Button
              variant="destructive"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
              data-testid="button-unpublish"
            >
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              data-testid="button-publish-confirm"
            >
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  const { data: issue, isLoading } = useQuery<IssueDetailData>({
    queryKey: [`/api/issues/${id}`],
    enabled: !!id,
  });

  const { data: teamMembers } = useQuery<User[]>({
    queryKey: ["/api/team"],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/issues/${id}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}`] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/issues/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}`] });
      toast({
        title: "Status updated",
        description: "Issue status has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiRequest("DELETE", `/api/issues/${id}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}`] });
      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleMention = (user: User) => {
    setNewComment((prev) => {
      // If the last character is @, replace it with the name. Otherwise just append with @.
      if (prev.endsWith("@")) {
        return prev + `${user.firstName} `;
      }
      return prev + `@${user.firstName} `;
    });
    setShowMentions(false);
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
    closed: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
    won: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    lost: { bg: "bg-red-500/10", text: "text-red-500" },
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Issue not found</h2>
        <p className="text-muted-foreground mb-4">
          This issue may have been deleted or you don't have access to it.
        </p>
        <Button asChild>
          <Link href="/issues">Back to Issues</Link>
        </Button>
      </div>
    );
  }

  const statusConfig = statusColors[issue.status] || statusColors.open;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        issueId={issue.id}
        isPublished={issue.isPublished || false}
      />

      <div className="mb-6">
        <Link href="/issues">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-issues">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Issues
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-issue-title">
              {issue.title}{" "}
              <span className="text-muted-foreground font-normal">
                #{issue.issueNumber}
              </span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="secondary"
                className={`${statusConfig.bg} ${statusConfig.text} capitalize`}
              >
                {issue.status}
              </Badge>
              {issue.isPublished && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Published
                  </span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                Opened by{" "}
                <span className="font-medium">
                  {issue.createdBy?.firstName || "Unknown"}
                </span>{" "}
                on{" "}
                {issue.createdAt &&
                  new Date(issue.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={issue.isPublished ? "secondary" : "default"}
              onClick={() => setPublishDialogOpen(true)}
              className="gap-2"
              data-testid="button-publish"
            >
              {issue.isPublished ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  Manage Chat
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Publish to Client
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-issue-menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/issues/${issue.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Issue
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    updateStatusMutation.mutate(
                      issue.status === "open" ? "closed" : "open"
                    )
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {issue.status === "open" ? "Close Issue" : "Reopen Issue"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatusMutation.mutate("won")}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Mark as Won
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatusMutation.mutate("lost")}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mark as Lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {issue.description && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={issue.createdBy?.profileImageUrl || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {issue.createdBy?.firstName?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {issue.createdBy?.firstName || "Unknown"}{" "}
                        {issue.createdBy?.lastName || ""}
                      </span>
                      {issue.createdBy?.isAdmin && (
                        <div className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <Star className="h-2.5 w-2.5 text-white fill-white" />
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">
                        opened this issue
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {issue.description.split("\n").map((line, i) => (
                    <p key={i}>{line || <br />}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {issue.comments?.map((comment) => (
            <CommentCard 
              key={comment.id} 
              comment={comment}
              canDelete={!comment.isClientComment}
              onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
            />
          ))}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.firstName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">Add a comment</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Textarea
                  placeholder="Write a comment... Use @ to mention team members"
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    if (e.target.value.endsWith("@")) {
                      setShowMentions(true);
                    } else {
                      setShowMentions(false);
                    }
                  }}
                  className="min-h-32 mb-3"
                  data-testid="textarea-new-comment"
                />
                {showMentions && teamMembers && teamMembers.length > 0 && (
                  <div className="absolute bottom-16 left-0 w-72 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-border bg-muted/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Mention Someone
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => handleMention(member)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left border-b border-border/50 last:border-b-0"
                          data-testid={`mention-option-${member.id}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage
                              src={member.profileImageUrl || undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {member.firstName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.role || "Team Member"}
                            </p>
                          </div>
                          {member.isAdmin && (
                            <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" type="button">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowMentions(!showMentions)}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => addCommentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-submit-comment"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Assignees
                </h4>
                {issue.assignees && issue.assignees.length > 0 ? (
                  <div className="space-y-2">
                    {issue.assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={assignee.profileImageUrl || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs">
                            {assignee.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.firstName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No assignees</p>
                )}
                <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add assignee
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Labels
                </h4>
                {issue.labels && issue.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No labels</p>
                )}
              </div>

              {(issue.contactName || issue.contactEmail || issue.contactCompany) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Contact
                  </h4>
                  <div className="text-sm space-y-1">
                    {issue.contactName && <p className="font-medium">{issue.contactName}</p>}
                    {issue.contactEmail && (
                      <p className="text-muted-foreground">{issue.contactEmail}</p>
                    )}
                    {issue.contactCompany && (
                      <p className="text-muted-foreground">{issue.contactCompany}</p>
                    )}
                  </div>
                </div>
              )}

              {issue.dealValue && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Deal Value
                  </h4>
                  <p className="text-lg font-semibold">
                    ${issue.dealValue.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {issue.isPublished && issue.publishedSlug && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Public Chat Link
                    </h4>
                    <a
                      href={`/chat/${issue.publishedSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                      data-testid="link-public-chat"
                    >
                      Open Chat
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Team Discussion
                  </h4>
                  <Button asChild variant="outline" className="w-full justify-start" data-testid="button-team-chat">
                    <Link href={`/issues/${issue.id}/team-chat`}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Join Team Chat
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
