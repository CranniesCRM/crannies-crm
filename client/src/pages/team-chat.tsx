import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Users, Star, ArrowLeft } from "lucide-react";
import type { IssueWithDetails, CommentWithAuthor, User } from "@shared/schema";
import type { Badge } from "@/components/ui/badge";

interface TeamChatData {
  issue: IssueWithDetails;
  comments: CommentWithAuthor[];
  teamMembers: User[];
}

function ChatMessage({
  comment,
  clientLogoUrl,
}: {
  comment: CommentWithAuthor;
  clientLogoUrl?: string;
}) {
  const authorName = comment.author
    ? `${comment.author.firstName || ""} ${comment.author.lastName || ""}`.trim()
    : comment.authorName || "Unknown";
  const authorInitial = authorName?.[0] || "?";

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          src={comment.author?.profileImageUrl || undefined}
          className="object-cover"
        />
        <AvatarFallback className={`text-xs ${comment.isClientComment ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
          {authorInitial}
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[70%]">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">
            {authorName}
          </span>
          {comment.isClientComment && (
            <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
              {clientLogoUrl && (
                <img
                  src={clientLogoUrl}
                  alt="Client logo"
                  className="h-3 w-3 rounded-full object-cover"
                />
              )}
              <span>Client</span>
            </div>
          )}
        </div>
        {comment.author && !comment.isClientComment && (comment.author.role || comment.author.teamName) && (
          <div className="text-xs text-muted-foreground mb-1">
            {comment.author.role && comment.author.teamName
              ? `${comment.author.role} • ${comment.author.teamName}`
              : comment.author.role || comment.author.teamName}
          </div>
        )}
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {comment.createdAt &&
            new Date(comment.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
        </p>
      </div>
    </div>
  );
}

export default function TeamChat() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<TeamChatData>({
    queryKey: [`/api/issues/${id}/team-chat`],
    enabled: !!id,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/issues/${id}/comments`, {
        content,
      });
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.comments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!data?.issue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Chat not found</h2>
          <Button asChild>
            <Link href="/issues">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Issues
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <Link href={`/issues/${data.issue.id}`}>
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Issue
              </Button>
            </Link>
            <h1 className="font-semibold">{data.issue.title}</h1>
            <p className="text-sm text-muted-foreground">
              #{data.issue.issueNumber} • Team Discussion
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {data.issue.description && (
              <div className="border-b pb-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Issue Description
                </p>
                <p className="text-sm">{data.issue.description}</p>
              </div>
            )}
            {data.comments?.map((comment) => (
              <ChatMessage key={comment.id} comment={comment} clientLogoUrl={data.issue?.createdBy?.clientLogoUrl || undefined} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  sendMessageMutation.mutate(message);
                }
              }}
              data-testid="input-team-chat-message"
            />
            <Button
              onClick={() => sendMessageMutation.mutate(message)}
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="button-send-team-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="hidden lg:block w-64 border-l p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </h3>
          <div className="space-y-3">
            {data.teamMembers?.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={member.profileImageUrl || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xs">
                    {member.firstName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.role}
                  </p>
                </div>
                {member.isAdmin && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
