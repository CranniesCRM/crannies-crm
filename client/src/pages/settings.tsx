import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, User, Building2, Save, Code, Copy, CreditCard, Link, Unlink, RefreshCw, CheckCircle } from "lucide-react";
import type { Workspace } from "@shared/schema";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  teamName: z.string().min(1, "Team is required"),
  profileImageUrl: z.string().optional(),
});

const workspaceSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  billingEmail: z.string().email("Invalid email"),
  industry: z.string().min(1, "Industry is required"),
  bio: z.string().optional(),
  logoUrl: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type WorkspaceData = z.infer<typeof workspaceSchema>;

const teams = [
  "Sales",
  "Marketing",
  "Design",
  "Engineering",
  "Customer Success",
  "Operations",
  "Finance",
  "HR",
  "Executive",
  "Other",
];

const roles = [
  "Account Executive",
  "Sales Manager",
  "Marketing Manager",
  "Designer",
  "Product Manager",
  "Customer Success Manager",
  "CEO",
  "CTO",
  "COO",
  "Other",
];

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Consulting",
  "Marketing",
  "Other",
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);

  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>({
    queryKey: ["/api/workspace"],
    enabled: user?.isAdmin || false,
  });

  // Check if workspace has Stripe Connect enabled
  const isStripeConnectEnabled = !!(workspace?.stripeConnectAccountId && workspace?.stripeConnectEnabled);
  const isStripeConnectOnboardingStarted = workspace?.stripeConnectOnboardingStarted;
  const isStripeConnectOnboardingComplete = workspace?.stripeConnectOnboardingComplete;
  const stripeConnectOnboardingStatus = workspace?.stripeConnectOnboardingStatus;
  const stripeConnectAccountId = workspace?.stripeConnectAccountId;
  const stripeConnectChargesEnabled = workspace?.stripeConnectChargesEnabled;
  const stripeConnectPayoutsEnabled = workspace?.stripeConnectPayoutsEnabled;
  const stripeConnectBusinessProfile = workspace?.stripeConnectBusinessProfile;
  const stripeConnectLastWebhookEvent = workspace?.stripeConnectLastWebhookEvent;
  const stripeConnectLastWebhookTimestamp = workspace?.stripeConnectLastWebhookTimestamp;
  const stripeConnectOnboardingEvents = workspace?.stripeConnectOnboardingEvents;
  const stripeConnectRequirementsCurrentlyDue = workspace?.stripeConnectRequirementsCurrentlyDue;
  const stripeConnectRequirementsEventuallyDue = workspace?.stripeConnectRequirementsEventuallyDue;
  const stripeConnectRequirementsPastDue = workspace?.stripeConnectRequirementsPastDue;
  const stripeConnectAccountLink = workspace?.stripeConnectAccountLink;
  const stripeConnectAccountLinkExpires = workspace?.stripeConnectAccountLinkExpires;

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "",
      teamName: user?.teamName || "",
      profileImageUrl: user?.profileImageUrl || "",
    },
  });

  const workspaceForm = useForm<WorkspaceData>({
    resolver: zodResolver(workspaceSchema),
    values: {
      name: workspace?.name || "",
      billingEmail: workspace?.billingEmail || "",
      industry: workspace?.industry || "",
      bio: workspace?.bio || "",
      logoUrl: workspace?.logoUrl || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      return await apiRequest("PATCH", "/api/users/me", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (data: WorkspaceData) => {
      return await apiRequest("PATCH", "/api/workspace", data);
    },
    onSuccess: () => {
      toast({
        title: "Workspace updated",
        description: "Workspace settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workspace"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workspace",
        variant: "destructive",
      });
    },
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/users/generate-api-key");
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Generated",
        description: "Your new API key has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate API key",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/users/api-key");
    },
    onSuccess: () => {
      toast({
        title: "API Key Deleted",
        description: "Your API key has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  // Stripe Connect integration mutations
  const createStripeConnectAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create Stripe Connect account");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the workspace query to refresh the data with onboarding started
      queryClient.invalidateQueries({ queryKey: ["/api/workspace"] });
      
      // Redirect to Stripe Connect onboarding
      window.location.href = data.onboardingUrl;
    },
    onError: (error: Error) => {
      console.error("Stripe Connect account creation error:", error);
      toast({
        title: "Stripe Connect Setup",
        description: "Failed to create Stripe Connect account. Please try again.",
        variant: "destructive",
      });
      setStripeConnectLoading(false);
    },
  });

  const refreshStripeConnectStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/connect/refresh-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to refresh Stripe Connect status");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status Updated",
        description: "Stripe Connect status refreshed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workspace"] });
    },
    onError: (error: Error) => {
      console.error("Stripe Connect status refresh error:", error);
      toast({
        title: "Status Update Failed",
        description: "Failed to refresh Stripe Connect status.",
        variant: "destructive",
      });
    },
  });

  // Generate account link for verification
  const generateAccountLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/connect/generate-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate account link");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Open the account link in a new window
      window.open(data.accountLink, '_blank');
      toast({
        title: "Account Link Generated",
        description: "Opening verification form in a new tab.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workspace"] });
    },
    onError: (error: Error) => {
      console.error("Account link generation error:", error);
      toast({
        title: "Account Link Failed",
        description: error.message || "Failed to generate account link.",
        variant: "destructive",
      });
    },
  });

  // Check if verification is required
  const hasVerificationRequirements = (stripeConnectRequirementsCurrentlyDue as any[])?.length > 0 || 
                                      (stripeConnectRequirementsPastDue as any[])?.length > 0;
  const requiresVerification = stripeConnectOnboardingStatus === 'requires_verification' || hasVerificationRequirements;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and workspace settings
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit((data) =>
                  updateProfileMutation.mutate(data)
                )}
                className="space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={profileForm.watch("profileImageUrl") || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-2xl">
                        {profileForm.watch("firstName")?.[0] || ""}
                        {profileForm.watch("lastName")?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="profile-upload-settings"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover-elevate"
                    >
                      <Upload className="h-4 w-4" />
                    </label>
                    <input
                      id="profile-upload-settings"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            profileForm.setValue(
                              "profileImageUrl",
                              reader.result as string
                            );
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      data-testid="input-profile-image-settings"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name-settings" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name-settings" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-role-settings">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-team-settings">
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team} value={team}>
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Access your data programmatically using the REST API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">API Key</label>
                <p className="text-sm text-muted-foreground mb-2">
                  Generate an API key for programmatic access from external applications. This key can be used in the Authorization header.
                </p>
                <div className="flex gap-2 mb-2">
                  {user?.apiKey ? (
                    <>
                      <Input
                        value={user.apiKey}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-api-key"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(user.apiKey!);
                          toast({
                            title: "Copied",
                            description: "API key copied to clipboard",
                          });
                        }}
                        data-testid="button-copy-api-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteApiKeyMutation.mutate()}
                        disabled={deleteApiKeyMutation.isPending}
                        data-testid="button-delete-api-key"
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => generateApiKeyMutation.mutate()}
                      disabled={generateApiKeyMutation.isPending}
                      data-testid="button-generate-api-key"
                    >
                      {generateApiKeyMutation.isPending ? "Generating..." : "Generate API Key"}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">API Examples</label>
                <p className="text-sm text-muted-foreground mb-2">
                  Here are examples of how to make authenticated API requests:
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs font-mono overflow-x-auto">
{`// Using API Key (for external applications)
const response = await fetch('/api/issues', {
  headers: {
    'Authorization': 'Bearer ${user?.apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  }
});

// Using session cookies (for same-origin requests)
const response = await fetch('/api/issues', {
  credentials: 'include'
});

// Create a new issue
const response = await fetch('/api/issues', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${user?.apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Deal',
    description: 'Deal description',
    contactName: 'John Doe',
    contactEmail: 'john@example.com'
  })
});

// Bulk create issues
const response = await fetch('/api/issues/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${user?.apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    issues: [
      {
        title: 'Deal 1',
        contactName: 'John Doe',
        contactEmail: 'john@example.com'
      },
      {
        title: 'Deal 2',
        contactName: 'Jane Smith',
        contactEmail: 'jane@example.com'
      }
    ]
  })
});`}
                  </pre>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Available Endpoints</label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><code>GET /api/issues</code> - List issues (query: ?status=open|closed|won|lost)</p>
                  <p><code>POST /api/issues</code> - Create issue</p>
                  <p><code>POST /api/issues/bulk</code> - Create multiple issues</p>
                  <p><code>GET /api/issues/:id</code> - Get issue details</p>
                  <p><code>PATCH /api/issues/:id</code> - Update issue</p>
                  <p><code>POST /api/issues/:id/comments</code> - Add comment</p>
                  <p><code>GET /api/auth/user</code> - Get current user</p>
                  <p><code>GET /api/team</code> - List team members</p>
                  <p><code>GET /api/dashboard/stats</code> - Get dashboard statistics</p>
                  <p><code>GET /api/activities/recent</code> - Get recent activities</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Public Chat Endpoints</label>
                <p className="text-sm text-muted-foreground mb-2">
                  For published issues (no authentication required, uses passcodes):
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><code>GET /api/chat/:slug</code> - Get published chat</p>
                  <p><code>POST /api/chat/:slug/verify</code> - Verify passcode</p>
                  <p><code>POST /api/chat/:slug/message</code> - Send message</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {user?.isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Workspace Settings</CardTitle>
                  <CardDescription>
                    Manage your company workspace settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workspaceLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Form {...workspaceForm}>
                  <form
                    onSubmit={workspaceForm.handleSubmit((data) =>
                      updateWorkspaceMutation.mutate(data)
                    )}
                    className="space-y-6"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {workspaceForm.watch("logoUrl") ? (
                            <img
                              src={workspaceForm.watch("logoUrl")}
                              alt="Company logo"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        <label
                          htmlFor="logo-upload-settings"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover-elevate"
                        >
                          <Upload className="h-4 w-4" />
                        </label>
                        <input
                          id="logo-upload-settings"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                workspaceForm.setValue(
                                  "logoUrl",
                                  reader.result as string
                                );
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          data-testid="input-logo-settings"
                        />
                      </div>
                    </div>

                    <FormField
                      control={workspaceForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-company-name-settings" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={workspaceForm.control}
                        name="billingEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                data-testid="input-billing-email-settings"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={workspaceForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-industry-settings">
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industries.map((industry) => (
                                  <SelectItem key={industry} value={industry}>
                                    {industry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={workspaceForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              className="min-h-24"
                              {...field}
                              data-testid="textarea-bio-settings"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={updateWorkspaceMutation.isPending}
                      data-testid="button-save-workspace"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateWorkspaceMutation.isPending
                        ? "Saving..."
                        : "Save Workspace"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}

        {user?.isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Payment Processing</CardTitle>
                  <CardDescription>
                    Accept payments from customers using Stripe Connect
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!isStripeConnectEnabled && !isStripeConnectOnboardingStarted ? (
                  <div className="text-center py-6">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Connect Your Stripe Account</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      Connect your Stripe account to accept payments directly from your customers.
                      You'll be able to process credit cards, ACH transfers, and more.
                    </p>
                    <Button
                      onClick={() => createStripeConnectAccountMutation.mutate()}
                      disabled={createStripeConnectAccountMutation.isPending || stripeConnectLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {stripeConnectLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Setting up Stripe Connect...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Connect Stripe Account
                        </>
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        PCI DSS compliant
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Bank-level security
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Instant setup
                      </div>
                    </div>
                  </div>
                ) : isStripeConnectOnboardingStarted && !isStripeConnectOnboardingComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <RefreshCw className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-blue-800">
                            Stripe Connect Onboarding
                          </h3>
                          <p className="text-sm text-blue-600">
                            {stripeConnectOnboardingStatus === 'in_progress' ? 'Completing account setup...' :
                             stripeConnectOnboardingStatus === 'requires_verification' ? 'Verification required to continue setup...' :
                             stripeConnectOnboardingStatus === 'authorized' ? 'Account authorized, finalizing setup...' : 'Onboarding in progress'}
                          </p>
                          {stripeConnectLastWebhookEvent && (
                            <p className="text-xs text-blue-500 mt-1">
                              Last event: {stripeConnectLastWebhookEvent} • {stripeConnectLastWebhookTimestamp ? new Date(stripeConnectLastWebhookTimestamp).toLocaleString() : 'Just now'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-blue-600">
                        Onboarding
                      </Badge>
                    </div>

                    {/* Verification Requirements Section */}
                    {requiresVerification && (
                      <div className="p-6 border-2 border-amber-300 rounded-xl bg-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                              <CheckCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-amber-900 text-lg">Verification Required</h4>
                              <p className="text-sm text-amber-700">Additional verification needed to enable payouts</p>
                            </div>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => generateAccountLinkMutation.mutate()}
                            disabled={generateAccountLinkMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 shadow-md"
                          >
                            {generateAccountLinkMutation.isPending ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Link className="mr-2 h-4 w-4" />
                                Complete Verification Now
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {stripeConnectRequirementsCurrentlyDue && (stripeConnectRequirementsCurrentlyDue as any[]).length > 0 ? (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                              <p className="text-sm font-bold text-amber-900">Currently Due:</p>
                            </div>
                            <div className="space-y-2">
                              {(stripeConnectRequirementsCurrentlyDue as any[]).map((requirement: string, index: number) => (
                                <div key={index} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg font-medium">
                                  {requirement}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {stripeConnectRequirementsPastDue && (stripeConnectRequirementsPastDue as any[]).length > 0 ? (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-3 w-3 rounded-full bg-red-500"></div>
                              <p className="text-sm font-bold text-red-900">Past Due (Urgent):</p>
                            </div>
                            <div className="space-y-2">
                              {(stripeConnectRequirementsPastDue as any[]).map((requirement: string, index: number) => (
                                <div key={index} className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
                                  {requirement}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-800 font-medium mb-2">
                            ⚡ Complete verification to unlock:
                          </p>
                          <ul className="text-xs text-amber-700 space-y-1 ml-4">
                            <li>• Full payment processing capabilities</li>
                            <li>• Direct deposits to your bank account</li>
                            <li>• Complete Stripe Connect integration</li>
                          </ul>
                        </div>

                        {stripeConnectAccountLink && (
                          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm font-medium text-amber-800 mb-1">Active Verification Link:</p>
                            <a
                              href={stripeConnectAccountLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 underline hover:text-blue-800 break-all"
                            >
                              Click here to complete verification requirements
                            </a>
                            {stripeConnectAccountLinkExpires && (
                              <p className="text-xs text-amber-700 mt-1">
                                <strong>Expires:</strong> {new Date(stripeConnectAccountLinkExpires).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Onboarding Progress</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshStripeConnectStatusMutation.mutate()}
                          disabled={refreshStripeConnectStatusMutation.isPending}
                        >
                          {refreshStripeConnectStatusMutation.isPending ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stripeConnectAccountId ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm">Account Created</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stripeConnectChargesEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm">Charges Enabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stripeConnectPayoutsEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm">Payouts Enabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isStripeConnectOnboardingComplete ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm">Onboarding Complete</span>
                        </div>
                      </div>
                    </div>

                    {stripeConnectOnboardingEvents && Array.isArray(stripeConnectOnboardingEvents) && stripeConnectOnboardingEvents.length > 0 ? (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Recent Onboarding Events</div>
                        <div className="space-y-2 text-sm">
                          {(stripeConnectOnboardingEvents as Array<any>).slice(-3).reverse().map((event: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="text-xs text-muted-foreground w-32 truncate">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                              <div className="text-xs font-medium text-blue-600">
                                {event.event}
                              </div>
                              <div className="text-xs text-muted-foreground flex-1 truncate">
                                {JSON.stringify(event.data)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => refreshStripeConnectStatusMutation.mutate()}
                        disabled={refreshStripeConnectStatusMutation.isPending}
                      >
                        {refreshStripeConnectStatusMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Status
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateAccountLinkMutation.mutate()}
                        disabled={generateAccountLinkMutation.isPending}
                      >
                        {generateAccountLinkMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Link className="mr-2 h-4 w-4" />
                            Complete Setup
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-green-800">
                            Stripe Connect Account
                          </h3>
                          <p className="text-sm text-green-600">
                            {stripeConnectChargesEnabled && stripeConnectPayoutsEnabled
                              ? 'Account fully configured and ready for payments'
                              : 'Account connected, completing setup...'
                            }
                          </p>
                          {stripeConnectLastWebhookEvent && (
                            <p className="text-xs text-green-500 mt-1">
                              Last event: {stripeConnectLastWebhookEvent} • {stripeConnectLastWebhookTimestamp ? new Date(stripeConnectLastWebhookTimestamp).toLocaleString() : 'Just now'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Connected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Account Status</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshStripeConnectStatusMutation.mutate()}
                            disabled={refreshStripeConnectStatusMutation.isPending}
                          >
                            {refreshStripeConnectStatusMutation.isPending ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Charges:</span>
                            <Badge
                              variant={stripeConnectChargesEnabled ? "default" : "secondary"}
                              className={stripeConnectChargesEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {stripeConnectChargesEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Payouts:</span>
                            <Badge
                              variant={stripeConnectPayoutsEnabled ? "default" : "secondary"}
                              className={stripeConnectPayoutsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {stripeConnectPayoutsEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Account Details</div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Account ID: {stripeConnectAccountId?.slice(0, 20)}...</p>
                          <p>Onboarding: {isStripeConnectOnboardingComplete ? "Complete" : "In Progress"}</p>
                          <p>Status: <span className="text-green-600">Active</span></p>
                          {stripeConnectBusinessProfile && typeof stripeConnectBusinessProfile === 'object' ? (
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                              <p className="font-medium text-gray-800">Business Profile</p>
                              <p>{(stripeConnectBusinessProfile as any).name}</p>
                              <p className="text-xs">{(stripeConnectBusinessProfile as any).product_description}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {stripeConnectOnboardingEvents && Array.isArray(stripeConnectOnboardingEvents) && stripeConnectOnboardingEvents.length > 0 ? (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Recent Onboarding Events</div>
                        <div className="space-y-2 text-sm">
                          {(stripeConnectOnboardingEvents as Array<any>).slice(-5).reverse().map((event: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="text-xs text-muted-foreground w-32 truncate">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                              <div className="text-xs font-medium text-green-600">
                                {event.event}
                              </div>
                              <div className="text-xs text-muted-foreground flex-1 truncate">
                                {JSON.stringify(event.data)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => refreshStripeConnectStatusMutation.mutate()}
                        disabled={refreshStripeConnectStatusMutation.isPending}
                      >
                        {refreshStripeConnectStatusMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Status
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateAccountLinkMutation.mutate()}
                        disabled={generateAccountLinkMutation.isPending}
                      >
                        {generateAccountLinkMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Link className="mr-2 h-4 w-4" />
                            Manage Account
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Benefits of Stripe Connect</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Accept credit cards, ACH, and other payment methods</li>
                    <li>• Direct payments to your connected Stripe account</li>
                    <li>• Automatic invoice payment tracking and reconciliation</li>
                    <li>• PCI DSS compliant and bank-level security</li>
                    <li>• Real-time payment notifications and webhooks</li>
                    <li>• Integrated with your existing Stripe account</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}