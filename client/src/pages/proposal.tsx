import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, Calendar, Globe, Mail, MessageSquare, Users } from "lucide-react";

type ProposalDetail = {
  id: string;
  rfpId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  website?: string | null;
  teamSize?: string | null;
  certifications?: string[] | null;
  hourlyRate?: number | null;
  coverLetter?: string | null;
  technicalApproach?: string | null;
  timeline?: string | null;
  budget?: number | null;
  status?: string | null;
  submittedAt?: string;
  rfp?: {
    id: string;
    title: string;
    companyName: string;
    deadline?: string | null;
  };
};

const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) return "Not provided";
  return `$${(value / 100).toLocaleString()}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export default function ProposalView() {
  const { id } = useParams();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullName = useMemo(() => {
    if (!proposal) return "";
    return `${proposal.firstName} ${proposal.lastName}`.trim();
  }, [proposal]);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/proposals/${id}`, { credentials: "include" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch proposal");
        }
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await res.json() : await res.text().then((t) => {
          try {
            return JSON.parse(t);
          } catch {
            throw new Error("Unexpected response while fetching proposal");
          }
        });
        setProposal(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load proposal");
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

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

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Unable to load proposal
            </CardTitle>
            <CardDescription>{error || "Please try again later."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposal</p>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
              {proposal.company}
            </h1>
            {proposal.vendorLogoUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={proposal.vendorLogoUrl}
                  alt={`${proposal.company} logo`}
                  className="h-10 w-10 object-contain rounded border border-slate-200 bg-white"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-xs text-muted-foreground">Submitted by vendor</span>
              </div>
            )}
            {proposal.rfp && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{proposal.rfp.title}</Badge>
                <span>•</span>
                <span>{proposal.rfp.companyName}</span>
                {proposal.rfp.deadline && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Due {formatDate(proposal.rfp.deadline)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/rfp/${proposal.rfpId}`}>View RFP</Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link href={`/vendors/chat?email=${encodeURIComponent(proposal.email)}&id=${proposal.rfpId}`}>
                Open Chat
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr,0.7fr]">
          <Card className="bg-white shadow-md border border-slate-200">
            <CardHeader>
              <CardTitle>Submission</CardTitle>
              <CardDescription>
                Submitted {formatDate(proposal.submittedAt || proposal.rfp?.deadline)} by {fullName || "Vendor"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Cover Letter</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {proposal.coverLetter || "Not provided"}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Technical Approach</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {proposal.technicalApproach || "Not provided"}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {proposal.timeline || "Not provided"}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Budget</h3>
                <p className="text-sm text-slate-700">{formatCurrency(proposal.budget)}</p>
              </section>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Vendor</CardTitle>
                <CardDescription>Contact and company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                {proposal.vendorLogoUrl && (
                  <div className="flex items-center justify-center">
                    <img
                      src={proposal.vendorLogoUrl}
                      alt={`${proposal.company} logo`}
                      className="h-16 w-16 object-contain rounded border border-slate-200 bg-white"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{fullName || "Vendor contact"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${proposal.email}`} className="text-blue-600 hover:underline break-all">
                    {proposal.email}
                  </a>
                </div>
                {proposal.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={proposal.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                      {proposal.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{proposal.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {proposal.teamSize || "Team size n/a"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Rate: {proposal.hourlyRate ? `$${proposal.hourlyRate}/hr` : "Not provided"}
                  </Badge>
                </div>
                {proposal.certifications && proposal.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {proposal.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="pt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <img src="/favicon.png" alt="Colony logo" className="h-6 w-6 sm:h-7 sm:w-7" />
                <span>Powered by Colony</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
