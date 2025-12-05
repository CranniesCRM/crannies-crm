import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft, CircleDot } from "lucide-react";
import type { Rfp } from "@shared/schema";

const newIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactCompany: z.string().optional(),
  dealValue: z.string().optional(),
  labels: z.string().optional(),
  issueType: z.enum(["deal", "rfp"]).default("deal"),
  rfpId: z.string().optional(),
}).refine(
  (data) => data.issueType === "deal" || (data.issueType === "rfp" && data.rfpId),
  {
    message: "Select an RFP for vendor issues",
    path: ["rfpId"],
  },
);

type NewIssueData = z.infer<typeof newIssueSchema>;

export default function IssueNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: rfps = [] } = useQuery<Rfp[]>({
    queryKey: ["/api/rfps"],
  });

  const form = useForm<NewIssueData>({
    resolver: zodResolver(newIssueSchema),
    defaultValues: {
      title: "",
      description: "",
      contactName: "",
      contactEmail: "",
      contactCompany: "",
      dealValue: "",
      labels: "",
      issueType: "deal",
      rfpId: "",
    },
  });
  const issueType = form.watch("issueType");

  const createIssueMutation = useMutation({
    mutationFn: async (data: NewIssueData) => {
      const payload = {
        ...data,
        dealValue: data.dealValue ? parseInt(data.dealValue) : undefined,
        labels: data.labels
          ? data.labels.split(",").map((l) => l.trim()).filter(Boolean)
          : undefined,
        issueType: data.issueType || "deal",
        rfpId: data.issueType === "rfp" ? data.rfpId || undefined : undefined,
      };
      return await apiRequest("POST", "/api/issues", payload);
    },
    onSuccess: (data) => {
      toast({
        title: "Issue created",
        description: "Your new issue has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setLocation(`/issues/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create issue",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewIssueData) => {
    createIssueMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/issues">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Issues
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CircleDot className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle>New Issue</CardTitle>
              <CardDescription>
                Create a new issue to track a deal or contact
              </CardDescription>
            </div>
          </div>
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
                        placeholder="e.g., Enterprise deal with Acme Corp"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the deal, opportunity, or key details..."
                        className="min-h-32"
                        {...field}
                        data-testid="textarea-issue-description"
                      />
                    </FormControl>
              <FormDescription>
                Use Markdown for formatting. You can @mention team members.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="deal">Deal (customer chat)</SelectItem>
                  <SelectItem value="rfp">RFP vendor chat</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Route this thread to a customer or a vendor responding to an RFP.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {issueType === "rfp" && (
          <FormField
            control={form.control}
            name="rfpId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked RFP</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an RFP" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rfps.length === 0 ? (
                      <SelectItem value="" disabled>
                        No RFPs available
                      </SelectItem>
                    ) : (
                      rfps.map((rfp) => (
                        <SelectItem key={rfp.id} value={rfp.id}>
                          {rfp.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Vendors will be routed to this RFP&apos;s shared chat.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Smith"
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
                          placeholder="john@company.com"
                          {...field}
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormDescription>
                        {issueType === "rfp"
                          ? "Required so we can invite the vendor to Stream chat."
                          : "Optional if you just need a name today."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Corp"
                          {...field}
                          data-testid="input-contact-company"
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
                      <FormLabel>Deal Value ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          data-testid="input-deal-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labels</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="enterprise, q4-priority, demo-scheduled"
                        {...field}
                        data-testid="input-labels"
                      />
                    </FormControl>
                    <FormDescription>
                      Separate multiple labels with commas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/issues")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createIssueMutation.isPending}
                  data-testid="button-create-issue"
                >
                  {createIssueMutation.isPending ? "Creating..." : "Create Issue"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
