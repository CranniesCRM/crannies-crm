import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Issue } from "@shared/schema";
import { createInsertSchema } from "drizzle-zod";
import { issues } from "@shared/schema";

const editIssueSchema = createInsertSchema(issues).omit({
  id: true,
  issueNumber: true,
  workspaceId: true,
  createdById: true,
  publishedSlug: true,
  publishedPasscode: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
});

type EditIssueData = Partial<typeof editIssueSchema._type>;

export default function IssueEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: issue, isLoading } = useQuery<Issue>({
    queryKey: [`/api/issues/${id}`],
    enabled: !!id,
  });

  const form = useForm<EditIssueData>({
    resolver: zodResolver(editIssueSchema.partial()),
    defaultValues: {
      title: "",
      chatTitle: "",
      description: "",
      contactName: "",
      contactEmail: "",
      contactCompany: "",
      dealValue: undefined,
      labels: [],
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async (data: EditIssueData) => {
      const payload = {
        ...data,
        dealValue: data.dealValue ? parseInt(String(data.dealValue)) : undefined,
        labels: typeof data.labels === "string"
          ? data.labels.split(",").map((l) => l.trim()).filter(Boolean)
          : data.labels,
      };
      return await apiRequest("PATCH", `/api/issues/${id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Issue updated",
        description: "Your issue has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}`] });
      setLocation(`/issues/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update issue",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditIssueData) => {
    updateIssueMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <h2 className="text-xl font-semibold mb-2">Issue not found</h2>
        <Button asChild>
          <Link href="/issues">Back to Issues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/issues/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Issue
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Issue</CardTitle>
          <CardDescription>
            Update the issue details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Issue title"
                        defaultValue={issue.title}
                        {...field}
                        data-testid="input-issue-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chatTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chat Title (for published chat)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional - separate title for chat room"
                        defaultValue={issue.chatTitle || ""}
                        {...field}
                        data-testid="input-chat-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Issue description"
                        defaultValue={issue.description || ""}
                        {...field}
                        data-testid="input-issue-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact name"
                          defaultValue={issue.contactName || ""}
                          {...field}
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@example.com"
                          defaultValue={issue.contactEmail || ""}
                          {...field}
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company name"
                        defaultValue={issue.contactCompany || ""}
                        {...field}
                        data-testid="input-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dealValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        defaultValue={issue.dealValue || ""}
                        {...field}
                        data-testid="input-deal-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labels</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Separate labels with commas"
                        defaultValue={Array.isArray(issue.labels) ? issue.labels.join(", ") : ""}
                        {...field}
                        data-testid="input-labels"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={updateIssueMutation.isPending}
                  data-testid="button-save"
                >
                  {updateIssueMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                >
                  <Link href={`/issues/${id}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
