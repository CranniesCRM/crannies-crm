import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Mail, Globe, Phone, Building2, RefreshCw, MessageSquare } from "lucide-react";
import { CompanyLogo, extractDomain } from "@/components/company-logo";
import { useToast } from "@/hooks/use-toast";

interface SupplierRating {
  id: string;
  rating: number;
  qualityScore?: number | null;
  deliveryScore?: number | null;
  serviceScore?: number | null;
  priceScore?: number | null;
  comments?: string | null;
  createdAt: string;
}

interface VendorProfilePayload {
  vendor: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    rating?: number | null;
    paymentTerms?: string | null;
  };
  ratings: SupplierRating[];
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const safeParseJson = <T,>(raw: string, errorMessage: string): T => {
  const trimmed = raw?.trim?.() ?? "";
  if (!trimmed) {
    throw new Error(`${errorMessage}: empty response`);
  }
  const head = trimmed.slice(0, 20).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<body")) {
    throw new Error(`${errorMessage}: unexpected HTML response`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(errorMessage);
  }
};

function RatingPill({ value }: { value: number }) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
      {value.toFixed(1)}
    </Badge>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function VendorProfile() {
  const [data, setData] = useState<VendorProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const vendorId = urlParams.get("vendorId");
  const email = urlParams.get("email");
  const rfpId = urlParams.get("rfpId");

  const averageRating = useMemo(() => {
    if (!data?.ratings?.length) return null;
    const sum = data.ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
    return sum / data.ratings.length;
  }, [data]);



  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (vendorId) params.set("vendorId", vendorId);
      if (email) params.set("email", email);

      if (Array.from(params.keys()).length === 0) {
        throw new Error("Missing vendorId or email in the URL");
      }

      const response = await fetch(`/api/vendor/profile?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.status === 304) {
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load vendor profile");
      }

      const raw = await response.text();
      const payload = safeParseJson<VendorProfilePayload>(raw, "Unable to load vendor profile");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendorDomain = extractDomain(data?.vendor?.website || data?.vendor?.email);

  const initials = (data?.vendor?.name || data?.vendor?.email || "Vendor")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Vendor Profile</CardTitle>
            <CardDescription>{error || "Unable to load vendor profile."}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button onClick={refresh} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { vendor, ratings } = data;

  const startEmailThread = async () => {
    if (!vendor?.email) {
      toast({
        title: "Missing vendor email",
        description: "Vendor must have an email address to start an email thread.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, this would open the email thread dialog
      // For now, just show a success message
      toast({
        title: "Email thread ready",
        description: `You can now communicate with ${vendor.email} via email thread`,
      });
    } catch (error) {
      toast({
        title: "Failed to start email thread",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {vendorDomain ? (
              <CompanyLogo domain={vendorDomain} className="h-12 w-12" alt={`${vendor.name} logo`} />
            ) : (
              <Avatar className="h-12 w-12">
                <AvatarImage src={vendor.website || undefined} alt={vendor.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor Profile</p>
              <h1 className="text-2xl font-semibold">{vendor.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                {averageRating && <RatingPill value={averageRating} />}
                {vendor.paymentTerms && <Badge variant="outline">{vendor.paymentTerms}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Button
              className="flex items-center gap-2"
              onClick={startEmailThread}
              disabled={!vendor?.email}
              title={!vendor?.email ? "Vendor must have an email address" : "Start email thread with vendor"}
            >
              <Mail className="h-4 w-4" />
              Start Email Thread
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Company</CardTitle>
            <CardDescription>Key vendor details shared with buyers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {vendor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={vendor.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                    {vendor.website}
                  </a>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{vendor.address}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Overall Rating" value={averageRating ? `${averageRating.toFixed(1)} / 5` : "Not rated"} />
              <StatBlock label="Ratings Count" value={`${ratings.length}`} />
              <StatBlock label="Payment Terms" value={vendor.paymentTerms || "Not provided"} />
              <StatBlock label="Status" value="Active" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Ratings</CardTitle>
            <CardDescription>Scores and feedback from buyers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!ratings.length && (
              <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
                No ratings yet. They will appear here once buyers submit feedback.
              </div>
            )}

            {ratings.map((rating) => (
              <div key={rating.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <RatingPill value={rating.rating} />
                  <p className="text-xs text-muted-foreground">Rated on {formatDate(rating.createdAt)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <StatBlock label="Quality" value={rating.qualityScore ? `${rating.qualityScore}/100` : "—"} />
                  <StatBlock label="Delivery" value={rating.deliveryScore ? `${rating.deliveryScore}/100` : "—"} />
                  <StatBlock label="Service" value={rating.serviceScore ? `${rating.serviceScore}/100` : "—"} />
                  <StatBlock label="Price" value={rating.priceScore ? `${rating.priceScore}/100` : "—"} />
                </div>
                {rating.comments && (
                  <>
                    <Separator />
                    <p className="text-sm text-foreground leading-relaxed">{rating.comments}</p>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
