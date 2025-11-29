import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Lock, MessageSquare, Users, Star } from "lucide-react";
import cranniesLogo from "@assets/ChatGPT Image Nov 29, 2025, 05_12_28 AM_1764411187059.png";
import type { Issue, CommentWithAuthor, User } from "@shared/schema";

// Analytics.js type declarations
declare global {
  interface Window {
    analytics: {
      track: (event: string, properties?: any) => void;
      identify: (userId?: string, traits?: any) => void;
      page: (name?: string, properties?: any) => void;
    };
  }
}

interface PublicChatData {
  issue: Issue;
  comments: CommentWithAuthor[];
  teamMembers: User[];
  isAuthenticated: boolean;
  clientName?: string;
}

function PasscodeForm({
  slug,
  onSuccess,
}: {
  slug: string;
  onSuccess: (name: string) => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Track page view
    if (window.analytics) {
      window.analytics.page('Public Chat Access', {
        chat_slug: slug,
      });
    }
  }, [slug]);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/chat/${slug}/verify`, {
        passcode,
        name,
      });
    },
    onSuccess: () => {
      // Identify user and track successful chat access
      if (window.analytics) {
        if (email) {
          window.analytics.identify(email, {
            name: name,
            email: email,
            chat_slug: slug,
          });
        }
        window.analytics.track('chat_joined', {
          chat_slug: slug,
          client_name: name,
          client_email: email,
        });
      }
      onSuccess(name);
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message || "Invalid passcode",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src={cranniesLogo}
              alt="Crannies"
              className="h-10 w-10 rounded-md object-cover"
            />
            <span className="text-2xl font-bold">Crannies</span>
          </div>
          <CardTitle>Enter Chat Room</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Please enter the passcode and your name to join the conversation
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Name</label>
            <Input
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-chat-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Passcode</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="pl-10"
                data-testid="input-chat-passcode"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => verifyMutation.mutate()}
            disabled={!passcode || !name || verifyMutation.isPending}
            data-testid="button-join-chat"
          >
            {verifyMutation.isPending ? "Verifying..." : "Join Chat"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatMessage({
  comment,
  isClient,
  clientLogoUrl,
}: {
  comment: CommentWithAuthor;
  isClient: boolean;
  clientLogoUrl?: string;
}) {
  const isFromClient = comment.isClientComment;

  return (
    <div
      className={`flex gap-3 ${
        isFromClient ? "flex-row-reverse" : ""
      }`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          src={comment.author?.profileImageUrl || undefined}
          className="object-cover"
        />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {comment.author?.firstName?.[0] || comment.authorName?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[70%] ${isFromClient ? "text-right" : ""}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {comment.author
              ? `${comment.author.firstName || ""} ${comment.author.lastName || ""}`.trim()
              : comment.authorName || "Unknown"}
          </span>
          {comment.author?.role && !isFromClient && (
            <Badge variant="secondary" className="text-xs">
              {comment.author.role}
            </Badge>
          )}
          {isFromClient && (
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
        <div
          className={`p-3 rounded-lg ${
            isFromClient
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted rounded-bl-none"
          }`}
        >
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

function ChatRoom({
  slug,
  clientName,
}: {
  slug: string;
  clientName: string;
}) {
  const [message, setMessage] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState<string | undefined>();
  const [showLogoUpload, setShowLogoUpload] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<PublicChatData>({
    queryKey: [`/api/chat/${slug}`],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setClientLogoUrl(dataUrl);
      setShowLogoUpload(false);
      toast({
        title: "Logo added",
        description: "Your organization logo has been added to your profile.",
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/chat/${slug}/message`, {
        content,
        authorName: clientName,
      });
    },
    onSuccess: () => {
      // Track message sent
      if (window.analytics) {
        window.analytics.track('message_sent', {
          chat_slug: slug,
          client_name: clientName,
          issue_id: data?.issue?.id,
        });
      }
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

  useEffect(() => {
    // Identify user with contact email when chat loads
    if (data?.issue?.contactEmail && window.analytics) {
      window.analytics.identify(data.issue.contactEmail, {
        name: clientName,
        email: data.issue.contactEmail,
        chat_slug: slug,
        issue_id: data.issue.id,
        contact_company: data.issue.contactCompany,
      });
    }
  }, [data?.issue, clientName, slug]);

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
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Chat Not Found</h2>
            <p className="text-muted-foreground">
              This chat room may have been unpublished or doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={cranniesLogo}
              alt="Crannies"
              className="h-8 w-8 rounded-md object-cover"
            />
            <div>
              <h1 className="font-semibold">{data.issue.title}</h1>
              <p className="text-sm text-muted-foreground">
                #{data.issue.issueNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              Live
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {showLogoUpload && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Add Your Organization Logo</p>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-client-logo"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-logo"
                    >
                      Upload Logo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowLogoUpload(false)}
                      data-testid="button-skip-logo"
                    >
                      Skip for now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {data.issue.description && (
              <div className="border-b pb-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Issue Description
                </p>
                <p className="text-sm">{data.issue.description}</p>
              </div>
            )}
            {data.comments?.map((comment) => (
              <ChatMessage
                key={comment.id}
                comment={comment}
                isClient={comment.authorName === clientName}
                clientLogoUrl={clientLogoUrl}
              />
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
              data-testid="input-chat-message"
            />
            <Button
              onClick={() => sendMessageMutation.mutate(message)}
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
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

export default function PublicChat() {
  const { slug } = useParams<{ slug: string }>();
  const [authenticated, setAuthenticated] = useState(false);
  const [clientName, setClientName] = useState("");

  // Check if already authenticated via cookie
  const { data: authCheck, isLoading } = useQuery<{ authenticated: boolean; clientName?: string }>({
    queryKey: [`/api/chat/${slug}/auth-check`],
    enabled: !!slug,
  });

  useEffect(() => {
    if (authCheck?.authenticated) {
      setAuthenticated(true);
      setClientName(authCheck.clientName || "Client");
    }
  }, [authCheck]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <PasscodeForm
        slug={slug || ""}
        onSuccess={(name) => {
          setClientName(name);
          setAuthenticated(true);
        }}
      />
    );
  }

  return <ChatRoom slug={slug || ""} clientName={clientName} />;
}
