import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Mail,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Rfp } from "@shared/schema";

type ProposalFormState = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  vendorLogoUrl: string;
  website: string;
  teamSize: string;
  certifications: string;
  hourlyRate: string;
  capabilitiesStatementUrl: string;
  coverLetter: string;
  technicalApproach: string;
  timeline: string;
  budget: string;
};

const initialForm: ProposalFormState = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  vendorLogoUrl: "",
  website: "",
  teamSize: "",
  certifications: "",
  hourlyRate: "",
  capabilitiesStatementUrl: "",
  coverLetter: "",
  technicalApproach: "",
  timeline: "",
  budget: "",
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";

const statusTone: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  open: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  reviewing: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  closed: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  draft: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

const factIconMap = {
  deadline: Calendar,
  status: BadgeCheck,
  published: Clock,
  created: CheckCircle2,
};

const safeParseJson = <T,>(raw: string, errorMessage: string): T => {
  const trimmed = raw?.trim?.() ?? "";
  if (!trimmed) {
    throw new Error(`${errorMessage}: empty response`);
  }
  const snippet = trimmed.slice(0, 20).toLowerCase();
  if (snippet.startsWith("<!doctype") || snippet.startsWith("<html") || snippet.startsWith("<body")) {
    throw new Error(`${errorMessage}: unexpected HTML response`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(errorMessage);
  }
};

export default function RfpView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [rfp, setRfp] = useState<Rfp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState<ProposalFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/rfps/${id}`, { credentials: "include" });
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(raw || "Failed to load RFP");
        }
        setRfp(safeParseJson<Rfp>(raw, "Unexpected response format while loading RFP"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load RFP");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const keyFacts = useMemo(() => {
    if (!rfp) return [];
    return [
      {
        label: "Deadline",
        value: formatDate(rfp.deadline?.toString()),
        key: "deadline",
      },
      {
        label: "Status",
        value: rfp.status,
        key: "status",
      },
      {
        label: "Published",
        value: formatDate(rfp.publishedAt?.toString()),
        key: "published",
      },
      {
        label: "Created",
        value: formatDate(rfp.createdAt?.toString()),
        key: "created",
      },
    ];
  }, [rfp]);

  const sections = useMemo(() => {
    if (!rfp) return [];
    return [
      { title: "About the opportunity", content: rfp.about, icon: Building2 },
      { title: "Budget & compensation", content: rfp.budget, icon: DollarSign },
      { title: "Responsibilities", content: rfp.responsibilities, icon: Users },
      { title: "Process & timeline", content: rfp.process, icon: FileText },
    ].filter((section) => section.content);
  }, [rfp]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rfp?.id) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfpId: rfp.id,
          ...formState,
          certifications: formState.certifications
            .split(",")
            .map((token) => token.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setFormState(initialForm);
      setSuccess(true);
      toast({ title: "Proposal submitted", description: "We received your submission." });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Unable to submit proposal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [rfp, formState, toast]);

  const handleChange = useCallback(
    (key: keyof ProposalFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="space-y-3 w-full max-w-3xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !rfp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Unable to load RFP
            </CardTitle>
            <CardDescription>{error || "Please try again later."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusClass = statusTone[rfp.status] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="rounded-3xl bg-white shadow-lg border border-slate-100 overflow-hidden">
          <div className="bg-white px-6 py-10 text-slate-900">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Button asChild variant="ghost" className="text-muted-foreground hover:text-slate-900" size="sm">
                    <Link href="/">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to workspace
                    </Link>
                  </Button>
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/10">
                    <Shield className="h-3.5 w-3.5" />
                    {rfp.companyName}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{rfp.title}</h1>
                <p className="text-slate-600 max-w-2xl">
                  We partner with modern teams the same way Greenhouse does—transparent scopes, clear timelines, and faster decisions.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {rfp.status}
                  </span>
                  {rfp.deadline && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                        <Calendar className="h-4 w-4" />
                        Submit by {formatDate(rfp.deadline.toString())}
                      </span>
                    )}
                    {rfp.publishedAt && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                        <Clock className="h-4 w-4" />
                        Published {formatDate(rfp.publishedAt.toString())}
                    </span>
                  )}
                </div>
              </div>
              {rfp.companyLogo && (
                <div className="bg-white/10 rounded-2xl p-4">
                  <img src={rfp.companyLogo} alt={`${rfp.companyName} logo`} className="h-16 w-16 object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-6 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {keyFacts.map((fact) => {
                  const Icon = factIconMap[fact.key as keyof typeof factIconMap] || FileText;
                  return (
                    <div key={fact.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{fact.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <p className="font-semibold">{fact.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {sections.map((section) => (
                <Card key={section.title} className="border border-slate-100 shadow-sm">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <section.icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>What good looks like for this workstream.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{section.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border border-emerald-100 shadow-lg shadow-emerald-50 sticky top-8 self-start">
              <CardHeader>
                <CardTitle className="text-lg">Submit your proposal</CardTitle>
                <CardDescription>We love friendly detail, just like Greenhouse. Share context and send us your pitch.</CardDescription>
                {success && (
                  <div className="mt-2 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Thanks! Our team will review shortly.
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" value={formState.firstName} onChange={handleChange("firstName")} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" value={formState.lastName} onChange={handleChange("lastName")} required />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input id="email" type="email" value={formState.email} onChange={handleChange("email")} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" value={formState.company} onChange={handleChange("company")} required />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="teamSize">Team size</Label>
                      <Input id="teamSize" placeholder="15" value={formState.teamSize} onChange={handleChange("teamSize")} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="hourlyRate">Hourly rate (USD)</Label>
                      <Input
                        id="hourlyRate"
                        placeholder="140"
                        value={formState.hourlyRate}
                        onChange={handleChange("hourlyRate")}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="https://company.com" value={formState.website} onChange={handleChange("website")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vendorLogoUrl">Logo URL</Label>
                      <Input id="vendorLogoUrl" placeholder="https://company.com/logo.png" value={formState.vendorLogoUrl} onChange={handleChange("vendorLogoUrl")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="capabilitiesStatementUrl">Capabilities statement (URL)</Label>
                      <Input
                        id="capabilitiesStatementUrl"
                        placeholder="https://company.com/capabilities.pdf"
                        value={formState.capabilitiesStatementUrl}
                        onChange={handleChange("capabilitiesStatementUrl")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="certifications">Certifications</Label>
                      <Input
                        id="certifications"
                        placeholder="SBA, 8(a), ISO 27001"
                        value={formState.certifications}
                        onChange={handleChange("certifications")}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list. We use this to fast-track reviews.</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="budget">Estimated budget (USD)</Label>
                      <Input id="budget" placeholder="250000" value={formState.budget} onChange={handleChange("budget")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="timeline">Timeline</Label>
                      <Input id="timeline" placeholder="Start in 3 weeks, finish by Q4" value={formState.timeline} onChange={handleChange("timeline")} />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="coverLetter">Cover letter</Label>
                      <Textarea id="coverLetter" rows={4} value={formState.coverLetter} onChange={handleChange("coverLetter")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="technicalApproach">Technical approach</Label>
                      <Textarea
                        id="technicalApproach"
                        rows={4}
                        placeholder="Share how you structure the work, your philosophy, and success metrics."
                        value={formState.technicalApproach}
                        onChange={handleChange("technicalApproach")}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit proposal"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
