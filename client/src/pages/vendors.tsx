import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  Plus,
  Loader2,
  Star,
  Users,
} from "lucide-react";
import type { Proposal, Rfp, Vendor } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CompanyLogo, extractDomain } from "@/components/company-logo";
import { useAuth } from "@/hooks/useAuth";
import RfpPublishModal from "@/pages/rfp-publish";

type VendorFormState = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  paymentTerms: string;
  rating: string;
  notes: string;
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
};

const formatCurrency = (amount?: number | null) =>
  amount && amount > 0
    ? `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "Not provided";

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";

const initialForm: VendorFormState = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  paymentTerms: "net_30",
  rating: "",
  notes: "",
};

const ratingColor = (value?: number | null) => {
  if (!value) return "text-muted-foreground";
  if (value >= 4) return "text-emerald-600";
  if (value >= 3) return "text-amber-600";
  return "text-red-600";
};

const TypingPill = ({ names }: { names: string[] }) => {
  if (!names.length) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>
        {names.slice(0, 2).join(", ")}
        {names.length > 2 ? " and others" : ""} typing…
      </span>
    </div>
  );
};

const VendorListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx} className="rounded-lg border border-dashed border-slate-200 bg-muted/40 animate-pulse h-16" />
    ))}
  </div>
);


type VendorsPageProps = {
  embedded?: boolean;
};

export default function VendorsPage({ embedded = false }: VendorsPageProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => fetchJSON<Vendor[]>("/api/vendors"),
  });

  const { data: rfps = [], isLoading: rfpsLoading } = useQuery<Rfp[]>({
    queryKey: ["/api/rfps"],
    queryFn: () => fetchJSON<Rfp[]>("/api/rfps"),
  });

  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
    queryFn: () => fetchJSON<Proposal[]>("/api/proposals"),
  });

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("vendorId");
  });
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);
  const [formState, setFormState] = useState<VendorFormState>(initialForm);
  const [showRfpModal, setShowRfpModal] = useState(false);

  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) || null;

  useEffect(() => {
    if (!selectedVendorId && vendors.length > 0) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);


  const matchVendorForProposal = (proposal: Proposal & { vendorId?: string | null }) => {
    return vendors.find(
      (vendor) =>
        (proposal.vendorId && proposal.vendorId === vendor.id) ||
        (proposal.email && vendor.email && proposal.email.toLowerCase() === vendor.email.toLowerCase()) ||
        (proposal.company && vendor.name && proposal.company.toLowerCase() === vendor.name.toLowerCase()),
    );
  };

  const vendorProposals = useMemo(() => {
    if (!selectedVendor) return [];
    return proposals.filter((proposal: Proposal & { vendorId?: string | null }) => {
      const owner = matchVendorForProposal(proposal);
      return owner?.id === selectedVendor.id;
    });
  }, [proposals, selectedVendor, vendors]);

  const proposalsWithoutVendors = useMemo(() => {
    return proposals.filter((proposal: Proposal & { vendorId?: string | null }) => !matchVendorForProposal(proposal));
  }, [proposals, vendors]);

  const fallbackProposal = useMemo(() => {
    return vendorProposals[0] || proposalsWithoutVendors[0] || proposals[0];
  }, [vendorProposals, proposalsWithoutVendors, proposals]);

  const getVendorDomain = (vendor?: Vendor | null) => vendor?.website || vendor?.email || null;

  const vendorInvoiceShareLink = useMemo(() => {
    if (typeof window === "undefined" || !selectedVendor || !selectedRfpId) return null;
    const url = new URL(`${window.location.origin}/vendor/invoice`);
    url.searchParams.set("vendorId", selectedVendor.id);
    url.searchParams.set("rfpId", selectedRfpId);
    return url.toString();
  }, [selectedVendor?.id, selectedRfpId]);

  const copyVendorInvoiceLink = useCallback(() => {
    if (!vendorInvoiceShareLink) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(vendorInvoiceShareLink).then(() => {
        toast({
          title: "Link copied",
          description: "Share it with the vendor so they can upload invoices directly.",
        });
      });
    } else {
      window.prompt("Copy this link", vendorInvoiceShareLink);
    }
  }, [vendorInvoiceShareLink, toast]);

  useEffect(() => {
    if (vendorProposals.length && !selectedRfpId) {
      setSelectedRfpId(vendorProposals[0].rfpId);
    }
  }, [vendorProposals, selectedRfpId]);

  const createVendor = useMutation({
    mutationFn: async (payload: Partial<Vendor>) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor created", description: "The supplier is live in your workspace." });
      setFormState(initialForm);
    },
    onError: (err) => {
      toast({
        title: "Unable to create vendor",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const createVendorFromProposal = useMutation({
    mutationFn: async (proposal: Proposal) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: proposal.company,
          email: proposal.email,
          website: proposal.website,
          notes: proposal.coverLetter || proposal.technicalApproach,
          paymentTerms: "net_30",
          phone: null,
          address: null,
          rating: null,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor created", description: "Proposal converted into a vendor record." });
    },
    onError: (err) => {
      toast({
        title: "Unable to create vendor",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const stats = useMemo(() => {
    const avgRating =
      vendors.length > 0
        ? vendors.reduce((sum, vendor) => sum + (vendor.rating || 0), 0) / vendors.length
        : 0;

    return [
      {
        label: "Vendors",
        value: vendors.length,
        helper: "Verified suppliers",
        icon: Building2,
      },
      {
        label: "Active RFPs",
        value: rfps.filter((rfp) => ["open", "published", "reviewing"].includes(rfp.status || "")).length,
        helper: "Open sourcing work",
        icon: Users,
      },
      {
        label: "Submitted proposals",
        value: proposals.length,
        helper: "Across all RFPs",
        icon: BadgeCheck,
      },
      {
        label: "Avg. rating",
        value: avgRating ? avgRating.toFixed(1) : "—",
        helper: "Supplier score",
        icon: Star,
      },
    ];
  }, [vendors.length, vendors, rfps, proposals.length]);

  const handleCreateVendor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      toast({ title: "Vendor name is required", variant: "destructive" });
      return;
    }
    createVendor.mutate({
      name: formState.name,
      email: formState.email || undefined,
      phone: formState.phone || undefined,
      website: formState.website || undefined,
      address: formState.address || undefined,
      paymentTerms: formState.paymentTerms,
      rating: formState.rating ? Number(formState.rating) : undefined,
      notes: formState.notes || undefined,
    });
  };


  const isLoading = vendorsLoading || rfpsLoading;

  const wrapperClass = embedded
    ? "rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6"
    : "min-h-screen bg-slate-50";
  const innerClass = embedded
    ? "max-w-6xl mx-auto space-y-8"
    : "max-w-6xl mx-auto px-4 py-8 space-y-8";

  return (
    <div className={wrapperClass}>
      <div className={innerClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor Operations</p>
            <h1 className="text-3xl font-semibold text-slate-900">Partners & Sourcing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage suppliers, track proposals, and spin up RFP chats without leaving the workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowRfpModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New RFP
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add vendor
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add vendor</DialogTitle>
                <CardDescription>Invite a new supplier to collaborate on sourcing work.</CardDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateVendor}>
                <div className="grid gap-3">
                  <Label htmlFor="vendor-name">Vendor name</Label>
                  <Input
                    id="vendor-name"
                    placeholder="Acme Fabrication"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="vendor-email">Email</Label>
                    <Input
                      id="vendor-email"
                      type="email"
                      placeholder="hello@acme.com"
                      value={formState.email}
                      onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor-phone">Phone</Label>
                    <Input
                      id="vendor-phone"
                      placeholder="+1 (555) 123-4567"
                      value={formState.phone}
                      onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="vendor-website">Website</Label>
                  <Input
                    id="vendor-website"
                    placeholder="https://acme.com"
                    value={formState.website}
                    onChange={(event) => setFormState((prev) => ({ ...prev, website: event.target.value }))}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="vendor-address">Address</Label>
                  <Textarea
                    id="vendor-address"
                    rows={2}
                    placeholder="123 Supplier Lane, Denver CO"
                    value={formState.address}
                    onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="payment-terms">Payment terms</Label>
                    <Select
                      value={formState.paymentTerms}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, paymentTerms: value }))}
                    >
                      <SelectTrigger id="payment-terms">
                        <SelectValue placeholder="Select terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_45">Net 45</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor-rating">Rating</Label>
                    <Select
                      value={formState.rating}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, rating: value }))}
                    >
                      <SelectTrigger id="vendor-rating">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value} star{value > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="vendor-notes">Notes</Label>
                  <Textarea
                    id="vendor-notes"
                    rows={3}
                    placeholder="Capabilities, production tiers, or redlines"
                    value={formState.notes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createVendor.isPending}>
                    {createVendor.isPending ? "Saving..." : "Create vendor"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-md bg-slate-100 p-3">
                  <stat.icon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.helper}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Tabs defaultValue="vendors" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
              <TabsTrigger value="rfps">RFPs ({rfps.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vendors" className="space-y-4">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Vendor roster</CardTitle>
                  <CardDescription>Manage your supplier network and track performance.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <VendorListSkeleton />
                  ) : vendors.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                      <p className="font-medium text-slate-900 mb-1">No vendors yet</p>
                      <p className="text-sm text-muted-foreground">
                        Add your first supplier to unlock sourcing workflows.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Payment Terms</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map((vendor) => (
                          <TableRow
                            key={vendor.id}
                            className={`cursor-pointer ${
                              selectedVendorId === vendor.id ? "bg-slate-50" : ""
                            }`}
                            onClick={() => setSelectedVendorId(vendor.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <CompanyLogo
                                  domain={getVendorDomain(vendor)}
                                  className="h-8 w-8"
                                  alt={`${vendor.name} logo`}
                                />
                                <div>
                                  <p className="font-medium text-slate-900">{vendor.name}</p>
                                  {vendor.notes && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {vendor.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="text-slate-900">{vendor.email || "No email"}</p>
                                {vendor.phone && (
                                  <p className="text-muted-foreground">{vendor.phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {vendor.paymentTerms ? (
                                <Badge variant="outline" className="text-xs">
                                  {vendor.paymentTerms.replace("_", " ").toUpperCase()}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vendor.rating ? (
                                <div className={`flex items-center gap-1 ${ratingColor(vendor.rating)}`}>
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs">Unrated</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/vendor-profile?vendorId=${encodeURIComponent(vendor.id)}`}>
                                  Profile
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rfps" className="space-y-4">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>RFP pipeline</CardTitle>
                  <CardDescription>Active sourcing events and proposal tracking.</CardDescription>
                </CardHeader>
                <CardContent>
                  {rfps.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                      <p className="font-medium text-slate-900 mb-1">No RFPs yet</p>
                      <p className="text-sm text-muted-foreground">Publish an RFP to start collecting proposals.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RFP</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rfps.map((rfp) => (
                          <TableRow key={rfp.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">{rfp.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {rfp.about || "No description"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {rfp.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {rfp.deadline ? (
                                <span className="text-sm text-slate-700">
                                  {formatDate(rfp.deadline?.toString())}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">No deadline</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-700">{rfp.companyName}</span>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/rfp/${rfp.id}`}>
                                  <Building2 className="h-3 w-3 mr-1" />
                                  View RFP
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {proposalsWithoutVendors.length > 0 && (
                <Card className="border border-amber-100 shadow-sm">
                  <CardHeader>
                    <CardTitle>Proposals without vendors</CardTitle>
                    <CardDescription>Convert proposals into vendor records.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposalsWithoutVendors.slice(0, 5).map((proposal) => (
                          <TableRow key={proposal.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">{proposal.company}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {proposal.coverLetter || "No summary provided."}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-700">{proposal.email}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {proposal.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="secondary" size="sm" asChild>
                                  <Link href={`/proposal/${proposal.id}`}>Review</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => createVendorFromProposal.mutate(proposal)}
                                  disabled={createVendorFromProposal.isPending}
                                  className="flex items-center gap-2"
                                >
                                  {createVendorFromProposal.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Plus className="h-3 w-3" />
                                  )}
                                  Create vendor
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {proposalsWithoutVendors.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-4">
                        {proposalsWithoutVendors.length - 5} more proposals need vendor records.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Vendor profile</CardTitle>
                  <CardDescription>Contact, payment terms, and quick links.</CardDescription>
                </div>
                {selectedVendor && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/vendor-profile?vendorId=${encodeURIComponent(selectedVendor.id)}${
                        selectedRfpId ? `&rfpId=${encodeURIComponent(selectedRfpId)}` : ""
                      }`}
                    >
                      Profile
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {selectedVendor ? (
                  <div className="space-y-4">
                    <div>
                      <CompanyLogo
                        domain={getVendorDomain(selectedVendor)}
                        className="h-12 w-12 mb-3"
                        alt={`${selectedVendor.name} logo`}
                      />
                      <p className="text-lg font-semibold text-slate-900">{selectedVendor.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {selectedVendor.paymentTerms && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {selectedVendor.paymentTerms.replace("_", " ").toUpperCase()}
                          </span>
                        )}
                        {selectedVendor.rating && (
                          <span className={`flex items-center gap-1 ${ratingColor(selectedVendor.rating)}`}>
                            <Star className="h-4 w-4" />
                            {selectedVendor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
                      {selectedVendor.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          {selectedVendor.email}
                        </p>
                      )}
                      {selectedVendor.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-500" />
                          {selectedVendor.phone}
                        </p>
                      )}
                      {selectedVendor.website && (
                        <p className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-500" />
                          <a href={selectedVendor.website} target="_blank" rel="noreferrer" className="text-blue-600">
                            {selectedVendor.website}
                          </a>
                        </p>
                      )}
                      {selectedVendor.address && <p>{selectedVendor.address}</p>}
                    </div>
                    {selectedVendor && (
                      <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-white/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice intake link</p>
                        {selectedRfpId ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input readOnly value={vendorInvoiceShareLink ?? ""} className="text-xs font-mono" />
                            <Button variant="secondary" size="sm" onClick={copyVendorInvoiceLink}>
                              Copy
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Choose an RFP context to generate a link for this vendor.
                          </p>
                        )}
                      </div>
                    )}
                    {selectedVendor.notes && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Internal notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedVendor.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a vendor to load their profile.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Proposals</CardTitle>
                  <CardDescription>Submissions from this vendor across your RFPs.</CardDescription>
                </div>
                {selectedVendor && (
                  <Badge variant="secondary">{vendorProposals.length} active</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedVendor ? (
                  vendorProposals.length === 0 ? (
                    fallbackProposal ? (
                      <div className="rounded-xl border border-slate-200 bg-white/80 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{fallbackProposal.company}</p>
                            <p className="text-xs text-muted-foreground">
                              Suggested from submissions ({formatDate(fallbackProposal.submittedAt?.toString())})
                            </p>
                          </div>
                          <Badge variant="outline">{fallbackProposal.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {fallbackProposal.coverLetter || "No cover letter provided."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/proposal/${fallbackProposal.id}`}>Review proposal</Link>
                          </Button>
                          {!matchVendorForProposal(fallbackProposal) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => createVendorFromProposal.mutate(fallbackProposal)}
                              disabled={createVendorFromProposal.isPending}
                              className="flex items-center gap-2"
                            >
                              {createVendorFromProposal.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Create vendor
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We haven&apos;t officially linked this vendor yet—review the proposal to confirm.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
                        No proposals yet.
                      </div>
                    )
                  ) : (
                    vendorProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="rounded-xl border border-slate-200 bg-white/80 p-4 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{proposal.company}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {formatDate(proposal.submittedAt?.toString())}
                            </p>
                          </div>
                          <Badge variant="outline">{proposal.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {proposal.coverLetter || "No cover letter provided."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/proposal/${proposal.id}`}>
                              Proposal
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Select a vendor to review proposals.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* RFP Publish Modal */}
      <RfpPublishModal open={showRfpModal} onOpenChange={setShowRfpModal} />
    </div>
  );
}
