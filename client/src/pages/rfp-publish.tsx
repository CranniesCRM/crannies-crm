import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Users, Calendar, DollarSign, Loader2, X } from "lucide-react";
import type { Vendor } from "@shared/schema";

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

type RfpFormData = {
  title: string;
  about: string;
  responsibilities: string;
  budget: string;
  process: string;
  deadline: string;
  status: string;
  companyName: string;
};

const initialFormData: RfpFormData = {
  title: "",
  about: "",
  responsibilities: "",
  budget: "",
  process: "",
  deadline: "",
  status: "draft",
  companyName: "",
};

interface RfpPublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RfpPublishModal({ open, onOpenChange }: RfpPublishModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RfpFormData>(initialFormData);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => fetchJSON<Vendor[]>("/api/vendors"),
  });

  const createRfpMutation = useMutation({
    mutationFn: async (data: RfpFormData) => {
      const response = await fetch("/api/rfps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          budget: data.budget ? parseFloat(data.budget) * 100 : null, // Convert to cents
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (rfp) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps"] });
      toast({ title: "RFP created successfully", description: "Your RFP is now live for vendor responses." });
      setFormData(initialFormData);
      onOpenChange(false);
      setLocation(`/rfp/${rfp.id}`);
    },
    onError: (err) => {
      toast({
        title: "Failed to create RFP",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Title required", description: "Please provide a title for your RFP.", variant: "destructive" });
      return;
    }

    if (!formData.about.trim()) {
      toast({ title: "Description required", description: "Please provide a description for your RFP.", variant: "destructive" });
      return;
    }

    if (!formData.deadline) {
      toast({ title: "Deadline required", description: "Please set a response deadline.", variant: "destructive" });
      return;
    }

    setIsPublishing(true);
    try {
      await createRfpMutation.mutateAsync(formData);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    const draftData = { ...formData, status: "draft" };
    createRfpMutation.mutate(draftData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Publish RFP
          </DialogTitle>
          <DialogDescription>
            Create and publish a request for proposal to attract vendor responses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">RFP Details</CardTitle>
                <CardDescription>
                  Provide comprehensive information about your project requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Website Redesign Project"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">About the opportunity *</Label>
                  <Textarea
                    id="about"
                    rows={4}
                    placeholder="Describe your project, goals, and what you're looking to achieve..."
                    value={formData.about}
                    onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    rows={4}
                    placeholder="Detail the specific requirements, deliverables, and evaluation criteria..."
                    value={formData.responsibilities}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="process">Process & timeline</Label>
                  <Textarea
                    id="process"
                    rows={3}
                    placeholder="Describe the selection process, timeline, and evaluation criteria..."
                    value={formData.process}
                    onChange={(e) => setFormData(prev => ({ ...prev, process: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      placeholder="50000"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Response Deadline *</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company Name"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publish Settings</CardTitle>
                <CardDescription>
                  Control when and how your RFP is published.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Badge variant={formData.status === "draft" ? "secondary" : "default"}>
                      {formData.status === "draft" ? "Draft" : "Published"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    className="w-full"
                    disabled={createRfpMutation.isPending}
                  >
                    {createRfpMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save as Draft"
                    )}
                  </Button>

                  <Button
                    onClick={handlePublish}
                    className="w-full"
                    disabled={isPublishing || createRfpMutation.isPending}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Publish RFP
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Create RFP</p>
                    <p className="text-xs text-muted-foreground">Now</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Response Deadline</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.deadline ? new Date(formData.deadline).toLocaleDateString() : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Review Proposals</p>
                    <p className="text-xs text-muted-foreground">After deadline</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {vendors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Target Vendors
                  </CardTitle>
                  <CardDescription>
                    {vendors.length} vendors in your network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your RFP will be visible to all vendors in your network. They can submit proposals directly through the platform.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPublishing || createRfpMutation.isPending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Legacy full page component for backward compatibility
export function RfpPublishPage() {
  const [modalOpen, setModalOpen] = useState(true);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Publish RFP</h1>
            <p className="text-muted-foreground mt-1">
              Create and publish a request for proposal to attract vendor responses.
            </p>
          </div>
        </div>
        
        <div className="text-center py-20">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">RFP Publishing Modal</h2>
          <p className="text-muted-foreground mb-4">
            This component has been converted to a modal. Import and use RfpPublishModal instead.
          </p>
          <Button onClick={() => setModalOpen(true)}>
            Open RFP Publish Modal
          </Button>
        </div>
      </div>
      
      <RfpPublishModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}