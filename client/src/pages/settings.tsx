import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, User, Building2, Save, Code, Copy } from "lucide-react";
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

  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>({
    queryKey: ["/api/workspace"],
    enabled: user?.isAdmin || false,
  });

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
      </div>
    </div>
  );
}
